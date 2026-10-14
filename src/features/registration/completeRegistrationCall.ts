import { registrationCommitMatchesSession } from './pendingReservationTypes'
import { WalletSessionChangedError } from '../wallet/sessionWriteWallet'
import type { RegistrationQuote } from '@duskdomains/sdk'
import { safeNumber } from '../../names/numbers'
import {
  storeCompleteRegistrationRequest,
  createRegistrationLifecycle,
  createResolverRecord,
  namehashHex,
  registrationTotalLux,
  type ReviewedRegistrationQuote,
} from '../../names/internal'
import type { ReferralState } from '../referrals/referralState'
import type { UseRegistrationActionsProps } from './registrationActionTypes'
import type { PreparedRegistrationCommit } from './usePendingReservations'

export function createCompleteRegistrationRequest({
  appliedReferral,
  displayName,
  duration,
  feeConfig,
  lifecycleBaseBlockHeight,
  preparedCommit,
  quote,
  registerSetsPrimary,
  registrationTargetAddress,
  reservedQuote,
  result,
  selectedAddress,
  selectedAuthority,
  runtimeConfig,
}: Pick<UseRegistrationActionsProps,
  | 'displayName'
  | 'duration'
  | 'feeConfig'
  | 'lifecycleBaseBlockHeight'
  | 'registrationTargetAddress'
  | 'result'
  | 'selectedAddress'
  | 'selectedAuthority'
  | 'runtimeConfig'
> & {
  appliedReferral: ReferralState | null
  preparedCommit: PreparedRegistrationCommit
  /** Whether the reveal also makes the name primary, as decided from a read made for it. */
  registerSetsPrimary: boolean
  /** A new price the person confirmed after a policy change; otherwise the claim's own quote. */
  quote?: RegistrationQuote
  /** What the reservation was priced at, if saved with it. */
  reservedQuote?: ReviewedRegistrationQuote | null
}) {
  if (!registrationCommitMatchesSession(preparedCommit, selectedAuthority, selectedAddress, runtimeConfig.chainId)) throw new WalletSessionChangedError()
  const feeLux = quote ? safeNumber(quote.total_lux) : registrationTotalLux(result, duration, feeConfig)
  const lifecycle = createRegistrationLifecycle({
    startsAt: lifecycleBaseBlockHeight,
    years: duration,
  })
  const initialMoonlightRecord = createResolverRecord('moonlight_address', registrationTargetAddress)
  const call = storeCompleteRegistrationRequest({
    directory: preparedCommit.directory,
    commitmentStore: preparedCommit.commitmentStore,
    commitHeight: preparedCommit.committedBlockHeight ?? undefined,
    actor: selectedAuthority,
    commitment: preparedCommit.commitment,
    secret: preparedCommit.secret,
    node: namehashHex(displayName),
    label: result.label,
    durationYears: duration,
    feeLux,
    records: [initialMoonlightRecord],
    primaryEndpoint: registerSetsPrimary
      ? {
          endpointType: 'moonlight_address',
          endpointValue: registrationTargetAddress,
        }
      : null,
    referrer: appliedReferral?.principal ?? null,
  })

  return {
    call: { ...call, quote: quote ?? result.policyQuote, ...(reservedQuote ? { reservedQuote } : {}) },
    feeLux,
    initialMoonlightRecord,
    lifecycle,
  }
}
