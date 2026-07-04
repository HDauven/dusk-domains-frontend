export type RegistrationStepId = 'duration' | 'setup' | 'review' | 'purchase'

export type RegistrationStepDefinition = {
  id: RegistrationStepId
  label: string
  title: string
  description: string
}

export const registrationStepDefinitions: RegistrationStepDefinition[] = [
  {
    id: 'duration',
    label: 'Duration',
    title: 'Duration',
    description: 'Choose a duration.',
  },
  {
    id: 'setup',
    label: 'Wallet',
    title: 'Wallet',
    description: 'Connect the wallet that will own this domain.',
  },
  {
    id: 'review',
    label: 'Sign',
    title: 'Sign',
    description: 'Reserve this domain.',
  },
  {
    id: 'purchase',
    label: 'Purchase',
    title: 'Purchase',
    description: 'Complete the registration once the reservation is ready.',
  },
]
