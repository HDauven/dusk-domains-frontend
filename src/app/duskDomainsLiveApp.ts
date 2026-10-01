import { createDuskApp } from '@dusk/connect'
import type { DuskApp, DuskWallet } from '@dusk/connect'
import { createSessionWriteWallet } from '../features/wallet/sessionWriteWallet'
import type { DuskWalletLike } from '../features/wallet/walletSessionTypes'
import { createDuskDomainsConnectApp } from '@duskdomains/sdk/connect-app'
import {
  isPlaceholderContractId,
  type DuskConnectAppLike,
  type DuskDomainsRuntimeConfig,
} from '../names/internal'

type DuskDomainsLiveAppOptions = {
  runtimeConfig: DuskDomainsRuntimeConfig
  wallet: DuskWallet
  session: Pick<DuskWalletLike, 'state'>
  autoConnect?: boolean
}

type DuskDomainsLiveApp = {
  dusk: DuskApp
  names: DuskConnectAppLike
}

export function canUseLiveDuskDomainsWrites(config: DuskDomainsRuntimeConfig): boolean {
  return (
    config.liveWritesEnabled
    && !isPlaceholderContractId(config.contracts.router.contractId)
    && !isPlaceholderContractId(config.contracts.core.contractId)
    && !isPlaceholderContractId(config.contracts.treasury.contractId)
  )
}

export function createDuskDomainsLiveApp(options: DuskDomainsLiveAppOptions): DuskDomainsLiveApp {
  if (!canUseLiveDuskDomainsWrites(options.runtimeConfig)) {
    throw new Error('Dusk Domains live writes require configured contract IDs and live writes enabled.')
  }

  const createApp = (wallet: DuskWallet) => createDuskApp({
    wallet,
    nodeUrl: options.runtimeConfig.nodeUrl,
    chain: options.runtimeConfig.chainId === 'dusk:0'
      ? { nodeUrl: options.runtimeConfig.nodeUrl }
      : { chainId: options.runtimeConfig.chainId },
    autoConnect: options.autoConnect ?? true,
    contracts: options.runtimeConfig.contracts,
  })
  const dusk = createApp(options.wallet)
  const names = createDuskDomainsConnectApp(dusk)

  return {
    dusk,
    names: {
      ...names,
      async writeContract(params) {
        const wallet = createSessionWriteWallet(options.wallet, options.session, options.runtimeConfig.chainId, options.runtimeConfig.nodeUrl)
        try {
          return await createDuskDomainsConnectApp(createApp(wallet)).writeContract(params)
        } finally {
          wallet.destroy()
        }
      },
    },
  }
}
