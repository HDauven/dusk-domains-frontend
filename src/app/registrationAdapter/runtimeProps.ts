import type { AppViewModelInputs } from '../appViewTypes'

export function buildRegistrationRuntimeProps({
  appRuntime,
  derivedState,
  registrationRuntime,
}: AppViewModelInputs) {
  return {
    ...appRuntime,
    ...derivedState,
    ...registrationRuntime,
  }
}
