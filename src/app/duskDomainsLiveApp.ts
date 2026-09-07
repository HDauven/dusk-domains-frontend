import { createDuskApp } from '@dusk/connect'
import type { DuskApp, DuskWallet, DuskWalletOptions } from '@dusk/connect'
import { createDuskDomainsConnectApp } from '@duskdomains/sdk/connect-app'
import {
  isPlaceholderContractId,
  type DuskConnectAppLike,
  type DuskDomainsRuntimeConfig,
} from '../names/internal'

type DuskDomainsLiveAppOptions = {
  runtimeConfig: DuskDomainsRuntimeConfig
  wallet?: DuskWallet | DuskWalletOptions
  autoConnect?: boolean
}

type DuskDomainsLiveApp = {
  dusk: DuskApp
  names: DuskConnectAppLike
}

export function canUseLiveDuskDomainsWrites(config: DuskDomainsRuntimeConfig): boolean {
  return (
    config.liveWritesEnabled
    && !isPlaceholderContractId(config.contracts.core.contractId)
    && !isPlaceholderContractId(config.contracts.treasury.contractId)
  )
}

export function createDuskDomainsLiveApp(options: DuskDomainsLiveAppOptions): DuskDomainsLiveApp {
  if (!canUseLiveDuskDomainsWrites(options.runtimeConfig)) {
    throw new Error('Dusk Domains live writes require configured contract IDs and live writes enabled.')
  }

  const dusk = createDuskApp({
    wallet: options.wallet,
    nodeUrl: options.runtimeConfig.nodeUrl,
    chain: options.runtimeConfig.chainId === 'dusk:0'
      ? { nodeUrl: options.runtimeConfig.nodeUrl }
      : { chainId: options.runtimeConfig.chainId },
    autoConnect: options.autoConnect ?? true,
    contracts: options.runtimeConfig.contracts,
  })

  return {
    dusk,
    names: createDuskDomainsConnectApp(dusk),
  }
}
