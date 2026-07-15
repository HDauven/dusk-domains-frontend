import { useMemo } from 'react'
import { createDuskConnectKit } from '@dusk/connect/ui'
import { browserWriteProofUrlFromEnv } from './appEnv'
import { duskDomainsConnectOptions } from './appConstants'
import { createDuskNodeBlockHeightReader } from './duskNodeHeight'
import {
  createDuskDomainsMarketplaceOnChainClient,
  createDuskDomainsOnChainClient,
  createDuskDomainsIndexerClient,
  createDuskDomainsOnChainReadTransport,
  createDuskDomainsRuntimeConfig,
  type DuskDomainsRuntimeEnv,
} from '../names/internal'
import { canUseLiveDuskDomainsWrites, createDuskDomainsLiveApp } from './duskDomainsLiveApp'

export function useAppRuntime(env: DuskDomainsRuntimeEnv) {
  const runtimeConfig = useMemo(() => createDuskDomainsRuntimeConfig(env), [env])
  const browserWriteProofUrl = useMemo(() => browserWriteProofUrlFromEnv(env), [env])
  const recordSourceContractId = runtimeConfig.contracts.core.contractId
  const indexerClient = useMemo(() => (
    runtimeConfig.indexerUrl ? createDuskDomainsIndexerClient({ baseUrl: runtimeConfig.indexerUrl }) : null
  ), [runtimeConfig.indexerUrl])
  const getCurrentBlockHeight = useMemo(() => (
    createDuskNodeBlockHeightReader(runtimeConfig.nodeUrl)
  ), [runtimeConfig.nodeUrl])
  const connectKit = useMemo(() => createDuskConnectKit({
    modal: {
      appName: 'Dusk Domains',
      theme: 'dark',
      connectOptions: duskDomainsConnectOptions,
    },
  }), [])
  const wallet = connectKit.wallet
  const liveDuskDomainsApp = useMemo(() => (
    canUseLiveDuskDomainsWrites(runtimeConfig)
      ? createDuskDomainsLiveApp({ runtimeConfig, wallet, autoConnect: false }).names
      : null
  ), [runtimeConfig, wallet])
  const onChainReadTransport = useMemo(() => (
    liveDuskDomainsApp
      ? createDuskDomainsOnChainReadTransport(liveDuskDomainsApp, runtimeConfig.contracts)
      : null
  ), [liveDuskDomainsApp, runtimeConfig.contracts])
  const marketplaceOnChainClient = useMemo(() => {
    if (!onChainReadTransport || !runtimeConfig.contracts.marketplace) return null
    return createDuskDomainsMarketplaceOnChainClient(onChainReadTransport)
  }, [onChainReadTransport, runtimeConfig.contracts.marketplace])
  const duskDomainsOnChainClient = useMemo(() => {
    if (!onChainReadTransport) return null
    return createDuskDomainsOnChainClient({
      read: onChainReadTransport,
      currentBlockHeight: getCurrentBlockHeight,
    })
  }, [getCurrentBlockHeight, onChainReadTransport])
  return {
    browserWriteProofUrl,
    connectKit,
    connectOptions: duskDomainsConnectOptions,
    duskDomainsOnChainClient,
    getCurrentBlockHeight,
    indexerClient,
    liveDuskDomainsApp,
    marketplaceOnChainClient,
    recordSourceContractId,
    runtimeConfig,
    wallet,
  }
}
