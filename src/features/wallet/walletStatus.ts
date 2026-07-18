import type { DuskWalletState } from '../../names/internal'

export type WalletConnectionStatus = 'detecting' | 'missing' | 'disconnected' | 'locked' | 'wrong-network' | 'connected'

export type WalletSessionModel = {
  status: WalletConnectionStatus
  selectedAddress: string
  canSign: boolean
  expectedChainId: string
  walletChainId: string
  authorized: boolean
  providerDetected: boolean
  locked: boolean
}

export function deriveWalletSessionModel(
  state: DuskWalletState,
  discoveryReady: boolean,
  expectedChainId = '',
  expectedNodeUrl = '',
): WalletSessionModel {
  const status = walletConnectionStatus(state, discoveryReady, expectedChainId, expectedNodeUrl)
  const selectedAccount = state.selectedAddress ?? state.accounts[0] ?? ''
  const selectedAddress = status === 'connected' || status === 'wrong-network' ? selectedAccount : ''

  return {
    status,
    selectedAddress,
    canSign: status === 'connected' && walletCanSign(state, selectedAddress),
    expectedChainId: normalizeChainId(expectedChainId),
    walletChainId: normalizeChainId(state.chainId ?? ''),
    authorized: Boolean(state.authorized),
    providerDetected: walletProviderDetected(state),
    locked: status === 'locked',
  }
}

export function walletConnectionStatus(
  state: DuskWalletState,
  discoveryReady: boolean,
  expectedChainId = '',
  expectedNodeUrl = '',
): WalletConnectionStatus {
  if (!discoveryReady) return 'detecting'

  const providerDetected = walletProviderDetected(state)
  if (!providerDetected) return 'missing'
  if (state.authorized && state.profiles.length === 0) return 'locked'
  const selectedAccount = state.selectedAddress ?? state.accounts[0] ?? ''
  if (selectedAccount) {
    return walletNetworkMatchesExpected(state, expectedChainId, expectedNodeUrl) ? 'connected' : 'wrong-network'
  }
  return 'disconnected'
}

export {
  walletActionLabel,
  walletActionTitle,
  walletBlockedActionCopy,
  walletRequiredHeading,
  walletRequiredIntro,
  walletSetupActionCopy,
  walletSetupActionTitle,
  walletSetupValueCopy,
} from './walletCopy'

export function selectedWalletProviderName(state: DuskWalletState) {
  const providerId = typeof state.providerId === 'string' ? state.providerId : ''
  const selectedProvider = Array.isArray(state.availableProviders)
    ? state.availableProviders.find((provider) => provider.uuid === providerId)
    : null
  return selectedProvider?.name ?? 'Dusk Wallet'
}

export function walletCanSign(state: DuskWalletState, selectedAddress: string) {
  return Boolean(state.authorized && selectedAddress && state.profiles.length > 0)
}

function walletProviderDetected(state: DuskWalletState) {
  return Boolean(state.installed || state.providerInfo || state.availableProviders.length > 0)
}

function walletChainMatchesExpected(walletChainId: string | null | undefined, expectedChainId: string) {
  const walletChain = normalizeChainId(walletChainId ?? '')
  const expectedChain = normalizeChainId(expectedChainId)
  return !walletChain || !expectedChain || walletChain === expectedChain
}

function walletNetworkMatchesExpected(state: DuskWalletState, expectedChainId: string, expectedNodeUrl: string) {
  if (!walletChainMatchesExpected(state.chainId, expectedChainId)) return false
  const currentNode = normalizedUrl(state.node?.nodeUrl)
  const expectedNode = normalizedUrl(expectedNodeUrl)
  return !currentNode || !expectedNode || currentNode === expectedNode
}

function normalizedUrl(value: string | null | undefined) {
  try {
    const url = new URL(value ?? '')
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/u, '')}`
  } catch {
    return ''
  }
}

function normalizeChainId(chainId: string) {
  return chainId.trim().toLowerCase()
}
