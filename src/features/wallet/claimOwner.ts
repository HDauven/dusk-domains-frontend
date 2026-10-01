import { contractPrincipalFromWalletAccount } from '../../names/internal'
import type { DuskWalletState } from '@dusk/connect'

const prefix = 'dusk-domains:last-claim-owner:'

export function clearClaimOwner() {
  try {
    const storage = globalThis.sessionStorage
    for (let index = storage.length - 1; index >= 0; index--) {
      const key = storage.key(index)
      if (key?.startsWith(prefix)) storage.removeItem(key)
    }
  } catch { /* Storage may be unavailable. */ }
}

export function rememberClaimOwner(state: DuskWalletState) {
  if (!state.authorized || !state.selectedProfile || !state.chainId) return
  const account = state.selectedProfile.account
  const principal = contractPrincipalFromWalletAccount(account)
  try {
    globalThis.sessionStorage?.setItem(`${prefix}${state.chainId}`, principal.ok ? principal.principal : account)
  } catch { /* Keep connected claims available without storage. */ }
}
