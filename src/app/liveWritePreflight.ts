import { lux } from '@duskdomains/sdk'
import { captureWalletSession } from '../features/wallet/captureWalletSession'
import { WalletSessionChangedError } from '../features/wallet/sessionWriteWallet'
import type { DuskWalletLike } from '../features/wallet/walletSessionTypes'
import {
  type DuskConnectOptions,
  isWalletLockedMessage,
  userFacingErrorMessage,
} from '../names/internal'

import { normalizeWalletNodeUrl } from '../features/wallet/walletStatus'

export type BalanceWallet = {
  connect?: (options?: DuskConnectOptions) => Promise<unknown>
  getPublicBalance: () => Promise<{ value: string }>
  state?: DuskWalletLike['state']
  switchChain?: (params: { nodeUrl: string }) => Promise<unknown>
}

export type WalletModalControl = {
  open: () => void
}

type EnsurePublicBalanceForLiveWriteRequestArgs = {
  action: string
  connectKit: WalletModalControl
  connectOptions?: DuskConnectOptions
  expectedNodeUrl?: string
  liveWritesEnabled: boolean
  refreshWalletConnectionState: () => Promise<unknown>
  refreshWalletSessionState: () => Promise<unknown>
  setError: (message: string) => void
  wallet: BalanceWallet
}

export async function ensurePublicBalanceForLiveWriteRequest({
  action,
  connectKit,
  connectOptions,
  expectedNodeUrl,
  liveWritesEnabled,
  refreshWalletConnectionState,
  refreshWalletSessionState,
  setError,
  wallet,
}: EnsurePublicBalanceForLiveWriteRequestArgs) {
  if (!liveWritesEnabled) return true

  const session = wallet.state ? captureWalletSession(wallet as Pick<DuskWalletLike, 'state'>, false) : () => true
  const checkSession = () => { if (!session()) throw new WalletSessionChangedError() }
  try {
    checkSession()
    await ensureExpectedWalletNode({ expectedNodeUrl, refreshWalletSessionState, wallet })
    checkSession()
    const readable = await checkWalletPublicBalance({
      setError,
      wallet,
    })
    checkSession()
    return readable
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error)
    if (!session() || !isWalletLockedMessage(rawMessage)) {
      setError(`Could not check public balance before ${action}: ${userFacingErrorMessage(session() ? error : new WalletSessionChangedError())}`)
      return false
    }

    const recovered = await recoverLockedWalletForLiveWrite({
      action,
      connectKit,
      connectOptions,
      refreshWalletConnectionState,
      refreshWalletSessionState,
      setError,
      wallet,
    })
    if (!recovered) return false
    if (!session()) { setError(new WalletSessionChangedError().message); return false }

    try {
      await ensureExpectedWalletNode({ expectedNodeUrl, refreshWalletSessionState, wallet })
      checkSession()
      const readable = await checkWalletPublicBalance({
        setError,
        wallet,
      })
      checkSession()
      return readable
    } catch (retryError) {
      setError(`Could not check public balance before ${action}: ${userFacingErrorMessage(retryError)}`)
      return false
    }
  }
}

async function ensureExpectedWalletNode({
  expectedNodeUrl,
  refreshWalletSessionState,
  wallet,
}: {
  expectedNodeUrl?: string
  refreshWalletSessionState: () => Promise<unknown>
  wallet: BalanceWallet
}) {
  const expected = normalizeWalletNodeUrl(expectedNodeUrl)
  if (!expected) return
  const current = normalizeWalletNodeUrl(wallet.state?.node?.nodeUrl)
  if (current === expected) return
  if (!wallet.switchChain) throw new Error('Dusk Wallet cannot switch to the configured local node.')

  await wallet.switchChain({ nodeUrl: expectedNodeUrl! })
  await refreshWalletSessionState()
  const selected = normalizeWalletNodeUrl(wallet.state?.node?.nodeUrl)
  if (selected && selected !== expected) {
    throw new Error('Dusk Wallet did not switch to the configured local node.')
  }
}

// This step unlocks the wallet and verifies that its public balance can be read.
// Affordability is checked against the prepared SDK call immediately before signing.
async function checkWalletPublicBalance({
  setError,
  wallet,
}: {
  setError: (message: string) => void
  wallet: Pick<BalanceWallet, 'getPublicBalance'>
}) {
  const balance = await wallet.getPublicBalance()
  try {
    lux(balance?.value)
    return true
  } catch {
    setError('Could not read the wallet public balance.')
    return false
  }
}

export async function recoverLockedWalletForLiveWrite({
  action,
  connectKit,
  connectOptions,
  refreshWalletConnectionState,
  refreshWalletSessionState,
  setError,
  wallet,
}: {
  action: string
  connectKit: WalletModalControl
  connectOptions?: DuskConnectOptions
  refreshWalletConnectionState: () => Promise<unknown>
  refreshWalletSessionState: () => Promise<unknown>
  setError: (message: string) => void
  wallet: Pick<BalanceWallet, 'connect'>
}) {
  setError(`Unlock your wallet to continue ${action}.`)
  let directUnlockAttempted = false

  try {
    const status = await refreshWalletConnectionState()
    if (status === 'locked' && wallet.connect) {
      directUnlockAttempted = true
      await wallet.connect(connectOptions)
      const nextStatus = await refreshWalletSessionState()
      if (nextStatus === 'connected') {
        setError('')
        return true
      }
      return false
    }
    if (status === 'connected') {
      setError('')
      return true
    }
  } catch (error) {
    setError(userFacingErrorMessage(error))
    if (!directUnlockAttempted) {
      connectKit.open()
    }
    return false
  }

  if (!directUnlockAttempted) connectKit.open()
  return false
}
