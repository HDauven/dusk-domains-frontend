// The term is chosen on the claim card, so the wizard starts at the owner.
export type RegistrationStepId = 'setup' | 'review' | 'purchase'

export type RegistrationStepDefinition = {
  id: RegistrationStepId
  label: string
  title: string
  description: string
}

export const registrationStepDefinitions: RegistrationStepDefinition[] = [
  {
    id: 'setup',
    label: 'Wallet',
    title: 'Choose the owner',
    description: 'Connect the wallet that will own this name.',
  },
  {
    id: 'review',
    label: 'Reserve',
    title: 'Reserve it',
    description: 'Sign a sealed reservation. It keeps your pick private until you complete.',
  },
  {
    id: 'purchase',
    label: 'Complete',
    title: 'Make it yours',
    description: 'Once the reservation settles, sign again to register the name and pay.',
  },
]
