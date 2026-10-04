import { captureWalletSession } from '../features/wallet/captureWalletSession'
import { DuskWalletUserRejectedError } from '@dusk/connect'
import { WalletSessionChangedError } from '../features/wallet/sessionWriteWallet'
import { readTransactionReceipt, waitForConfirmation, type ConfirmationState, type PendingConfirmation } from './confirmationRead'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { DuskWalletLike } from '../features/wallet/walletSessionTypes'
import { walletConnectionStatus } from '../features/wallet/walletStatus'
import type { createWriteAccess } from './writeAccess'
import {
  duskDomainCallGasLimit,
  submitDuskDomainWrite as submitDuskDomainWriteCall,
  type DuskConnectAppLike,
  type DuskDomainsIndexerClient,
  type DuskDomainContractMap,
  type DuskDomainCallMetadata,
  type DuskDomainTxState,
  type SubmitDuskDomainWriteOptions,
} from '../names/internal'

export type SubmitNameWrite = ReturnType<typeof useDuskDomainWriter>

// One wallet write at a time. Preview never submits or simulates a transaction.
export function useDuskDomainWriter({
  getWorkspaceToken,
  wallet,
  chainId,
  nodeUrl,
  indexerClient,
  confirmOwnershipWrite,
  onPendingConfirmation,
  writeAccess,
  contracts,
  liveDuskDomainsApp,
}: {
  wallet: Pick<DuskWalletLike, 'state'>
  chainId: string
  getWorkspaceToken?: (name: string) => object | null
  onPendingConfirmation?: (pending: PendingConfirmation | null) => void
  nodeUrl?: string
  indexerClient?: DuskDomainsIndexerClient | null
  confirmOwnershipWrite?: (name: string, call: DuskDomainCallMetadata, kind?: 'transfer' | 'manager') => Promise<boolean> | undefined
  writeAccess: ReturnType<typeof createWriteAccess>
  contracts: DuskDomainContractMap
  liveDuskDomainsApp: DuskConnectAppLike | null
}) {
  const pendingWrite = useRef(false)
  const activeRead = useRef<AbortController | null>(null)
  useEffect(() => () => activeRead.current?.abort(), [])
  // A write can be prepared before a pause is observed; check the latest state at submit.
  const accessRef = useRef(writeAccess)
  useEffect(() => {
    accessRef.current = writeAccess
  })
  const captureWorkspace = useCallback((name: string) => {
    const token = getWorkspaceToken?.(name)
    return () => !getWorkspaceToken || (token != null && getWorkspaceToken(name) === token)
  }, [getWorkspaceToken])

  const captureSession = useCallback((account?: string) => {
    const session = captureWalletSession(wallet)
    const matchesAccount = !account || wallet.state.selectedProfile?.account === account
    const matchesChain = wallet.state.chainId?.trim().toLowerCase() === chainId.trim().toLowerCase()
    return () => matchesAccount && matchesChain && session()
  }, [chainId, wallet])

  const submit = useCallback(async (
    name: string,
    call: DuskDomainCallMetadata,
    options: SubmitDuskDomainWriteOptions & {
      ownershipChange?: 'transfer' | 'manager'
      workspace?: () => boolean
      session?: () => boolean
      beforeSign?: () => void
      onNotBroadcast?: () => void
    } = {},
  ): Promise<DuskDomainTxState & { ownershipConfirmed?: boolean }> => {
    const { ownershipChange, workspace, session: expectedSession, beforeSign, onNotBroadcast, ...writeOptions } = options
    const currentWorkspace = workspace ?? (() => true)
    if (!currentWorkspace()) return { status: 'rejected', context: { title: name } } as DuskDomainTxState
    const unavailable = accessRef.current.reason(call)
    if (unavailable) throw new Error(unavailable)
    if (pendingWrite.current) throw new Error('Finish the pending wallet transaction before starting another.')
    if (!liveDuskDomainsApp) throw new Error('Preview is read only. No transaction was sent.')
    const session = expectedSession ?? captureSession()
    if (!session()) throw new WalletSessionChangedError()
    const profile = wallet.state.selectedProfile
    let walletRequested = false
    let walletRejected = false
    const app: DuskConnectAppLike = {
      ...liveDuskDomainsApp,
      get chainId() { return liveDuskDomainsApp.chainId },
      async writeContract(params) {
        if (!currentWorkspace()) throw new Error('The name workspace changed before signing.')
        const unavailable = accessRef.current.reason(call)
        if (unavailable) throw new Error(unavailable)
        const state = wallet.state
        if (state.explicitlyDisconnected || walletConnectionStatus(state, true, chainId, chainId === 'dusk:0' ? nodeUrl : '') !== 'connected'
          || state.chainId?.trim().toLowerCase() !== chainId.trim().toLowerCase()
          || !profile || state.selectedProfile?.account !== profile.account || state.selectedProfile?.profileId !== profile.profileId) {
          throw new Error('The wallet session changed. Connect your wallet and try again.')
        }
        if (!session()) throw new WalletSessionChangedError()
        beforeSign?.()
        walletRequested = true
        try {
          return await liveDuskDomainsApp.writeContract(params)
        } catch (error) {
          // Transport failures can hide a broadcast; a local refusal or wallet rejection cannot.
          walletRejected = error instanceof DuskWalletUserRejectedError
            || error instanceof WalletSessionChangedError
            || (typeof error === 'object' && error !== null && 'code' in error && error.code === 4001)
          throw error
        }
      },
    }
    pendingWrite.current = true

    const controller = new AbortController()
    activeRead.current = controller
    let latest: DuskDomainTxState | null = null
    let stillConfirming: ReturnType<typeof setTimeout> | undefined
    const update = (state: ConfirmationState) => {
      if (state.txId && ['submitted', 'executing'].includes(state.status)) {
        onPendingConfirmation?.({ name, state: { ...state, txId: state.txId } })
      }
      if (currentWorkspace()) options.onUpdate?.(state)
    }
    const onUpdate = (state: DuskDomainTxState) => {
      latest = state
      if (state.txId && !stillConfirming) stillConfirming = setTimeout(() => {
        if (latest && ['submitted', 'executing'].includes(latest.status)) update({ ...latest, status: 'executing', message: 'Still confirming…' })
      }, 20_000)
      if (nodeUrl && state.txId && ['executed', 'timeout'].includes(state.status)) return
      update(state)
    }
    try {
      let state = await submitDuskDomainWriteCall(app, call, {
        contracts,
        ...writeOptions,
        gas: { limit: duskDomainCallGasLimit(call, { senderAddress: profile?.account }) },
        onUpdate,
        allowUnsafePreviewCall: !liveDuskDomainsApp && options.allowUnsafePreviewCall,
      })
      clearTimeout(stillConfirming)
      if (nodeUrl && state.txId && (state.status === 'executed' || state.status === 'timeout')) {
        const submitted = state
        const receipt = await waitForConfirmation(async () => {
          const receipt = await readTransactionReceipt(nodeUrl, submitted.txId!, controller.signal)
          if (!receipt || receipt.status === 'failed') return receipt
          if (indexerClient) {
            const health = await indexerClient.getHealth()
            if (!health.ok || (health.finalizedBlockHeight ?? -1) < receipt.blockHeight) return null
          }
          return receipt
        }, retryConfirmation => update({ ...submitted, status: 'executing', message: 'Still confirming…', retryConfirmation }),
        () => update({ ...submitted, status: 'executing', message: 'Still confirming…' }), controller.signal)
        state = { ...submitted, status: receipt.status, message: receipt.message }
        update(state)
      }
      if (state.status === 'executed') {
        if (currentWorkspace() && typeof window !== 'undefined') window.dispatchEvent(new Event('dusk-domains:write-confirmed'))
        const confirmation = currentWorkspace() && confirmOwnershipWrite?.(name, call, ownershipChange)
        if (confirmation) return { ...state, ownershipConfirmed: await confirmation }
      }
      return state
    } finally {
      clearTimeout(stillConfirming)
      activeRead.current = null
      pendingWrite.current = false
      onPendingConfirmation?.(null)
      if (!walletRequested || walletRejected) onNotBroadcast?.()
    }
  }, [captureSession, chainId, confirmOwnershipWrite, contracts, indexerClient, liveDuskDomainsApp, nodeUrl, onPendingConfirmation, wallet])
  return useMemo(() => {
    function write(...args: Parameters<typeof submit>) { return submit(...args) }
    // Object.assign attaches the click capture; it never invokes the writer or reads refs.
    // eslint-disable-next-line react-hooks/refs
    return Object.assign(write, { captureWorkspace, captureSession })
  }, [submit, captureWorkspace, captureSession])
}
