import { useMemo } from 'react'
import { validateRecordValue } from '../../names/internal'

export function useRegistrationFlowState({ selectedAddress }: { selectedAddress: string }) {
  const registrationTargetAddressErrors = useMemo(() => selectedAddress ? validateRecordValue('moonlight_address', selectedAddress) : [], [selectedAddress])
  return {
    registrationTargetAddress: selectedAddress,
    registrationTargetAddressErrors,
    registrationTargetReady: Boolean(selectedAddress && registrationTargetAddressErrors.length === 0),
  }
}
