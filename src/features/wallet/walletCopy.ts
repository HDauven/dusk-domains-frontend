import { abbreviate } from '../../utils/format'
import type { WalletConnectionStatus } from './walletStatus'

export function walletActionLabel(status: WalletConnectionStatus) {
  if (status === 'connected') return 'Wallet'
  if (status === 'detecting') return 'Checking Wallet'
  if (status === 'locked') return 'Unlock Wallet'
  if (status === 'wrong-network') return 'Switch Network'
  return 'Connect Wallet'
}

export function walletActionTitle(status: WalletConnectionStatus) {
  if (status === 'connected') return 'Open wallet connection'
  if (status === 'detecting') return 'Checking for Dusk Wallet'
  if (status === 'missing') return 'Open wallet connection'
  if (status === 'locked') return 'Open Dusk Wallet to unlock'
  if (status === 'wrong-network') return 'Switch Dusk Wallet to this app network'
  return 'Open Dusk Wallet to connect'
}

export function walletSetupValueCopy(status: WalletConnectionStatus, selectedAddress: string) {
  if (status === 'connected') return abbreviate(selectedAddress)
  if (status === 'wrong-network') return 'Wrong network'
  if (status === 'detecting') return 'Checking wallet...'
  if (status === 'missing') return 'Dusk Wallet not found'
  if (status === 'locked') return 'Wallet locked'
  return 'Not connected'
}

export function walletSetupActionTitle(status: WalletConnectionStatus) {
  if (status === 'missing') return 'Install wallet'
  if (status === 'detecting') return 'Checking wallet'
  if (status === 'locked') return 'Unlock wallet'
  if (status === 'wrong-network') return 'Switch network'
  return 'Connect wallet'
}

export function walletSetupActionCopy(status: WalletConnectionStatus) {
  if (status === 'missing') return 'Install or enable Dusk Wallet, then retry.'
  if (status === 'detecting') return 'Checking this browser.'
  if (status === 'locked') return 'Unlock Dusk Wallet to continue.'
  if (status === 'wrong-network') return 'Switch Dusk Wallet to this app network.'
  return 'Connect Dusk Wallet to continue.'
}

export function walletRequiredHeading(status: WalletConnectionStatus) {
  if (status === 'connected') return 'Ready'
  if (status === 'missing') return 'Wallet required'
  if (status === 'detecting') return 'Checking wallet'
  if (status === 'locked') return 'Wallet locked'
  if (status === 'wrong-network') return 'Wrong network'
  return 'Connect wallet'
}

export function walletRequiredIntro(status: WalletConnectionStatus, action: string) {
  if (status === 'connected') return action
  if (status === 'missing') return 'Install or enable Dusk Wallet to continue.'
  if (status === 'detecting') return 'Checking for Dusk Wallet.'
  if (status === 'locked') return 'Unlock Dusk Wallet to continue.'
  if (status === 'wrong-network') return 'Switch Dusk Wallet to this app network.'
  return 'Connect Dusk Wallet to continue.'
}

export function walletBlockedActionCopy(status: WalletConnectionStatus, fallback: string) {
  return status === 'connected' ? fallback : walletRequiredIntro(status, fallback)
}
