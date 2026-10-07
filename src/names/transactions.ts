import {
  formatLuxAsDusk,
  submitDuskDomainWrite as submitFrozen,
  checkPublicBalanceForWrite as checkBalance,
  type DuskDomainTxState as FrozenState,
  type FrozenCall,
  type DuskDomainTxStatus,
} from '@duskdomains/sdk'
import type {
  DuskConnectAppLike,
  DuskDomainCallMetadata,
  DuskDomainContractMap,
  DuskDomainDecodedContext,
  DuskDomainGas,
} from './commands'
import { userFacingErrorMessage } from './ui/errors'
export type WalletFrozenCall = {
  readonly role: import('@duskdomains/sdk').ContractRole
  readonly contractId: string
  readonly functionName: string
  readonly args: unknown
  readonly deposit: string
  readonly gasLimit: bigint
}
export type DuskDomainTxState = {
  status: DuskDomainTxStatus
  context: DuskDomainDecodedContext
  call?: { contract: string; functionName: string }
  txId?: string
  message?: string
  result?: unknown
  blockHeight?: number
}
export type SubmitDuskDomainWriteOptions = {
  name?: string
  gas?: DuskDomainGas
  onUpdate?: (state: DuskDomainTxState) => void
  timeoutMs?: number
  contracts?: DuskDomainContractMap
  allowUnsafePreviewCall?: boolean
}
export const isDuskDomainTxBusy = (s: DuskDomainTxState | null | undefined) =>
  !!s && ['preparing', 'awaiting_approval', 'submitted', 'executing'].includes(s.status)
export async function submitDuskDomainWrite(
  app: DuskConnectAppLike,
  request: DuskDomainCallMetadata,
  options: SubmitDuskDomainWriteOptions = {},
): Promise<DuskDomainTxState> {
  const context = {
      title: options.name ?? request.functionName,
      description: 'Confirm this action in your wallet.',
      fields: [],
    },
    call = { contract: request.contract, functionName: request.functionName }
  const update = (s: FrozenState): DuskDomainTxState => ({
    ...s,
    context,
    call,
    message: s.error ? userFacingErrorMessage(s.error) : undefined,
  })
  try {
    options.onUpdate?.({ status: 'preparing', context, call })
    if (!app.prepareIntent) throw new Error('Frozen write preparation unavailable')
    const frozen = await app.prepareIntent(request, options.name ?? '')
    const contract = options.contracts?.[request.contract]
    if (!contract) throw new Error('Contract configuration unavailable')
    const params = { contract, functionName: frozen.functionName, args: frozen, deposit: frozen.deposit }
    const state = await submitFrozen(
      {
        prepare: async () =>
          app.prepareContractCall(params) as Promise<import('@duskdomains/sdk/connect-app').PreparedCall>,
        submit: () => app.writeContract(params),
      },
      frozen as FrozenCall,
      { timeoutMs: options.timeoutMs, onUpdate: (s) => options.onUpdate?.(update(s)) },
    )
    return update(state)
  } catch (error) {
    const state: DuskDomainTxState = {
      status: 'failed',
      context,
      call,
      message: userFacingErrorMessage(error),
    }
    options.onUpdate?.(state)
    return state
  }
}
export function checkPublicBalanceForWrite(a: {
  balanceLux: string
  action: string
  transactionCount?: number
  extraRequiredLux?: bigint
}) {
  const result = checkBalance({
    balanceLux: a.balanceLux,
    depositLux: String(a.extraRequiredLux ?? 0n),
    gasLimit: 200_000_000n * BigInt(a.transactionCount ?? 1),
    gasPrice: 1n,
  })
  return result.ok
    ? result
    : {
        ...result,
        message:
          result.code === 'balance_unavailable'
            ? 'Could not read the wallet public balance.'
            : `Insufficient public DUSK for ${a.action}. Available: ${formatLuxAsDusk(BigInt(a.balanceLux))}. Required: ${formatLuxAsDusk(200_000_000n * BigInt(a.transactionCount ?? 1) + (a.extraRequiredLux ?? 0n))}.`,
      }
}
export const frozenPayload = (value: unknown) => value as FrozenCall
