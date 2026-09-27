import { useMemo } from 'react'
import { validateRecordValue } from '../../names/internal'
import type { WalletConnectionStatus } from '../wallet/walletStatus'
import { registrationStepDefinitions, type RegistrationStepId } from './registrationSteps'

type UseRegistrationFlowStateArgs = {
  canRegister: boolean
  committed: boolean
  registerSetsPrimary: boolean
  registrationAddressInput: string
  registrationStep: RegistrationStepId
  selectedAddress: string
  walletSetupState: WalletConnectionStatus
}

export function useRegistrationFlowState({
  canRegister,
  committed,
  registerSetsPrimary,
  registrationAddressInput,
  registrationStep,
  selectedAddress,
  walletSetupState,
}: UseRegistrationFlowStateArgs) {
  const registrationStepIndex = Math.max(0, registrationStepDefinitions.findIndex((step) => step.id === registrationStep))
  const registrationStepMeta = registrationStepDefinitions[registrationStepIndex] ?? registrationStepDefinitions[0]
  const registrationPreviousStep = registrationStepIndex > 0
    ? registrationStepDefinitions[registrationStepIndex - 1]?.id
    : null
  const registrationNextStep = registrationStepIndex < registrationStepDefinitions.length - 1
    ? registrationStepDefinitions[registrationStepIndex + 1]?.id
    : null
  const registrationStepDescription = registrationStep === 'setup'
    ? setupStepDescription(walletSetupState)
    : registrationStepMeta.description
  const registrationTargetAddress = registerSetsPrimary
    ? selectedAddress
    : registrationAddressInput.trim() || selectedAddress
  const registrationTargetAddressErrors = useMemo(
    () => registrationTargetAddress ? validateRecordValue('moonlight_address', registrationTargetAddress) : [],
    [registrationTargetAddress],
  )
  const registrationTargetReady = Boolean(
    selectedAddress &&
    registrationTargetAddress &&
    registrationTargetAddressErrors.length === 0,
  )
  const canContinueRegistrationStep = registrationStep === 'setup'
    ? Boolean(canRegister && registrationTargetReady && walletSetupState === 'connected')
    : registrationStep === 'review'
      ? Boolean(committed)
      : false

  return {
    canContinueRegistrationStep,
    registrationNextStep,
    registrationPreviousStep,
    registrationStepDescription,
    registrationTargetAddress,
    registrationTargetAddressErrors,
    registrationTargetReady,
  }
}

function setupStepDescription(walletSetupState: WalletConnectionStatus) {
  if (walletSetupState === 'connected') return 'This wallet will own the name. You can point it somewhere else.'
  if (walletSetupState === 'locked') return 'Unlock the wallet that will own this name.'
  if (walletSetupState === 'missing') return 'Install or enable Dusk Wallet to continue.'
  if (walletSetupState === 'wrong-network') return 'Switch Dusk Wallet to this app\'s network to continue.'
  return 'Connect the wallet that will own this name.'
}
