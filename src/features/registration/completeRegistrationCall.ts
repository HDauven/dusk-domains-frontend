import {
  coreCompleteRegistrationRuntimeCall,
  createRegistrationLifecycle,
  createResolverRecord,
  namehashHex,
  registrationFeeLux,
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
  registerSetsPrimary,
  registrationTargetAddress,
  result,
}: Pick<UseRegistrationActionsProps,
  | 'displayName'
  | 'duration'
  | 'feeConfig'
  | 'lifecycleBaseBlockHeight'
  | 'registerSetsPrimary'
  | 'registrationTargetAddress'
  | 'result'
> & {
  appliedReferral: ReferralState | null
  preparedCommit: PreparedRegistrationCommit
}) {
  const feeLux = registrationFeeLux(result.label, duration, feeConfig)
  const lifecycle = createRegistrationLifecycle({
    startsAt: lifecycleBaseBlockHeight,
    years: duration,
  })
  const initialMoonlightRecord = createResolverRecord('moonlight_address', registrationTargetAddress)
  const call = coreCompleteRegistrationRuntimeCall({
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
    call,
    feeLux,
    initialMoonlightRecord,
    lifecycle,
  }
}
