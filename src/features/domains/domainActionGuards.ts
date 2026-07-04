import {
  walletBlockedActionCopy,
  type WalletConnectionStatus,
} from '../wallet/walletStatus'

type SetActionError = (message: string) => void

export type DomainActionPrerequisite = {
  canContinue: boolean
  setError: SetActionError
  walletSetupState: WalletConnectionStatus
  blockedCopy: string
}

export function guardDomainActionPrerequisite({
  canContinue,
  setError,
  walletSetupState,
  blockedCopy,
}: DomainActionPrerequisite) {
  if (canContinue) return true
  setError(walletBlockedActionCopy(walletSetupState, blockedCopy))
  return false
}
