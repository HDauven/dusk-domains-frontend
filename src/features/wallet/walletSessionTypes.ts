import type { DuskConnectOptions, DuskProfile, DuskWalletState, SwitchChainParams } from '../../names/internal'

export type DuskWalletLike = {
  state: DuskWalletState
  connect?: (options?: DuskConnectOptions) => Promise<DuskProfile[]>
  requestShieldedAddress?: (params?: { account?: string; reason?: string; label?: string }) => Promise<string>
  switchChain?: (params: SwitchChainParams) => Promise<unknown>
  ready: () => Promise<unknown>
  refresh: () => Promise<unknown>
  discoverProviders: (options?: { timeoutMs?: number }) => Promise<unknown>
}

export type DuskConnectKitLike = {
  wallet: DuskWalletLike
  open: () => void
  destroy: () => void
  subscribe: (listener: (state: DuskWalletState) => void) => () => void
}
