import {
  formatLuxAsDusk,
  submitDuskDomainWrite as submitFrozen,
  checkPublicBalanceForWrite as checkBalance,
  WriteBalanceError,
  type BalancePreflightResult,
  type DuskDomainTxState as FrozenState,
  type FrozenCall,
  type DuskDomainTxStatus,
} from '@duskdomains/sdk'
import type { PreparedCall } from '@duskdomains/sdk/connect-app'
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
  balanceAction?: string
  gas?: DuskDomainGas
  onUpdate?: (state: DuskDomainTxState) => void
  timeoutMs?: number
  contracts?: DuskDomainContractMap
  allowUnsafePreviewCall?: boolean
}
const balanceActions: Record<string, string> = {
  commit: 'reserving this name',
  complete_registration: 'registering this name',
  renew: 'renewing this name',
  update_authorities: 'updating ownership',
  mutate_records_sender: 'saving these records',
  set_primary_name: 'setting the primary name',
  clear_primary_name: 'clearing the primary name',
  create_subname: 'creating this subname',
  remove_subname: 'managing this subname',
  take_back_subnames: 'taking back subnames',
  claim: 'claiming treasury funds',
  claim_all: 'claiming treasury funds',
  claim_referral_reward: 'claiming referral rewards',
  claim_all_referral_rewards: 'claiming referral rewards',
}
export const isDuskDomainTxBusy = (s: DuskDomainTxState | null | undefined) =>
  !!s && ['preparing', 'awaiting_approval', 'submitted', 'executing'].includes(s.status)
export async function submitDuskDomainWrite(
  app: DuskConnectAppLike,
  request: DuskDomainCallMetadata,
  options: SubmitDuskDomainWriteOptions = {},
): Promise<DuskDomainTxState> {
  const balanceAction = options.balanceAction ?? balanceActions[request.functionName] ?? request.functionName.replaceAll('_', ' ')
  const errorMessage = (error: unknown) => error instanceof WriteBalanceError
    ? balanceErrorMessage(error.details, balanceAction)
    : userFacingErrorMessage(error)
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
    message: s.error ? errorMessage(s.error) : undefined,
  })
  try {
    options.onUpdate?.({ status: 'preparing', context, call })
    if (!app.prepareIntent) throw new Error('Frozen write preparation unavailable')
    const frozen = await app.prepareIntent(request, options.name ?? '')
    const contract = options.contracts?.[request.contract]
    if (!contract) throw new Error('Contract configuration unavailable')
    const params = { contract, functionName: frozen.functionName, args: frozen, deposit: frozen.deposit }
    let prepared: PreparedCall
    const state = await submitFrozen(
      {
        prepare: async () => {
          prepared = await app.prepareContractCall(params) as PreparedCall
          return prepared
        },
        // Keep the reviewed price through submission; the SDK still rebuilds the call and checks funds again.
        submit: () => app.writeContract({ ...params, gas: prepared.gas }),
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
      message: errorMessage(error),
    }
    options.onUpdate?.(state)
    return state
  }
}
export function checkPublicBalanceForWrite(a: {
  balanceLux: unknown
  action: string
  prepared: Pick<PreparedCall, 'deposit' | 'gas'>
}) {
  const result = checkBalance({
    balanceLux: a.balanceLux,
    depositLux: a.prepared.deposit,
    gasLimit: BigInt(a.prepared.gas.limit),
    gasPrice: BigInt(a.prepared.gas.price),
  })
  return result.ok
    ? result
    : {
        ...result,
        message: balanceErrorMessage(result, a.action),
      }
}
function balanceErrorMessage(result: Extract<BalancePreflightResult, { ok: false }>, action: string) {
  return result.code === 'balance_unavailable'
    ? 'Could not read the wallet public balance.'
    : `Insufficient public DUSK for ${action}. Available: ${formatLuxAsDusk(result.availableLux!)}. Required: ${formatLuxAsDusk(result.requiredLux)}.`
}
export const frozenPayload = (value: unknown) => value as FrozenCall
