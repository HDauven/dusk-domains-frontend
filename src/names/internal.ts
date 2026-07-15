export * from '@duskdomains/sdk/internal'
export * from '@duskdomains/sdk/writes'
export * from '@duskdomains/sdk/write-proof'

export {
  createDuskWallet,
  DUSK_ANNOUNCE_PROVIDER_EVENT,
  DUSK_REQUEST_PROVIDER_EVENT,
  DUSK_SELECTED_PROVIDER_STORAGE_KEY,
} from '@dusk/connect'

export type {
  ConnectOptions as DuskConnectOptions,
  DuskProfile,
  DuskProvider,
  DuskProviderInfo,
  DuskWallet,
  DuskWalletState,
  SwitchChainParams,
} from '@dusk/connect'

export function installLocalDevDuskWallet(_options: unknown = {}) {
  void _options
  console.warn('The local dev wallet is no longer bundled with @duskdomains/sdk. Use a Dusk wallet provider for frontend testing.')
}
