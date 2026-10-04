import type { DuskWalletLike } from './walletSessionTypes'

// Capture values, not the mutable wallet snapshot. Generation also detects A → B → A.
export function captureWalletSession(wallet: Pick<DuskWalletLike, 'state'>, includeGeneration = true) {
  const { selectedProfile, providerId, chainId, generation } = wallet.state
  const account = selectedProfile?.account
  const profileId = selectedProfile?.profileId
  return () => {
    const state = wallet.state
    return Boolean(account && state.authorized !== false && !state.explicitlyDisconnected
      && state.selectedProfile?.account === account && state.selectedProfile?.profileId === profileId
      && state.providerId === providerId && state.chainId === chainId
      && (!includeGeneration || state.generation === generation))
  }
}
