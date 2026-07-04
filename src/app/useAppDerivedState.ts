import {
  deriveAppDerivedState,
  type UseAppDerivedStateArgs,
} from './appDerivedStateHelpers'

export function useAppDerivedState(args: UseAppDerivedStateArgs) {
  return deriveAppDerivedState(args)
}
