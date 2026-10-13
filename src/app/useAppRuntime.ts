import { createWriteAccess } from './writeAccess'
import { useMemo, useState } from 'react'
import { useOperatorPause } from './useOperatorPause'
import { usePoolMarketplace } from './usePoolMarketplace'
import { DuskWallet } from '@dusk/connect'
import { createWalletSession } from '../features/wallet/walletSession'
import { duskDomainsConnectOptions } from './appConstants'
import { createDuskNodeBlockHeightReader } from './duskNodeHeight'
import { createHealthyIndexerClient } from './indexerReadHelpers'
import {
  createDuskDomainsMarketplaceOnChainClient,
  createDuskDomainsOnChainClient,
  createDuskDomainsOnChainReadTransport,
  createDuskDomainsRuntimeConfig,
  type DuskDomainsRuntimeEnv,
} from '../names/internal'
import { canUseLiveDuskDomainsWrites, createDuskDomainsLiveApp } from './duskDomainsLiveApp'

export function useAppRuntime(env: DuskDomainsRuntimeEnv) {
  // A production build inlines import.meta.env as a new object at each use. Keying the
  // config on the env's values keeps it, and everything built from it, stable across
  // renders; keyed on identity, every render rebuilt the app and read the router again.
  const envKey = JSON.stringify(env)
  const runtimeConfig = useMemo(() => createDuskDomainsRuntimeConfig(JSON.parse(envKey) as DuskDomainsRuntimeEnv), [envKey])
  const recordSourceContractId = runtimeConfig.contracts.resolver.contractId
  // The indexer must report this site's network and contracts to be trusted.
  const indexerClient = useMemo(() => (
    runtimeConfig.indexerUrl ? createHealthyIndexerClient(runtimeConfig.indexerUrl, runtimeConfig) : null
  ), [runtimeConfig])
  const pause = useOperatorPause(indexerClient, `${runtimeConfig.chainId}:${runtimeConfig.contracts.directory.contractId}`)
  const getCurrentBlockHeight = useMemo(() => (
    createDuskNodeBlockHeightReader(runtimeConfig.nodeUrl)
  ), [runtimeConfig.nodeUrl])
  const [walletOpen, setWalletOpen] = useState(false)
  const baseWallet = useMemo(() => new DuskWallet({ autoRefresh: false }), [])
  const wallet = useMemo(() => createWalletSession(baseWallet), [baseWallet])
  const connectKit = useMemo(() => ({
    wallet,
    open: () => setWalletOpen(true),
    close: () => setWalletOpen(false),
    subscribe: wallet.subscribe.bind(wallet),
    destroy: wallet.destroy.bind(wallet),
  }), [wallet])
  const liveDuskDomainsApp = useMemo(() => (
    canUseLiveDuskDomainsWrites(runtimeConfig)
      ? createDuskDomainsLiveApp({ runtimeConfig, wallet: baseWallet, session: wallet, autoConnect: false }).names
      : null
  ), [runtimeConfig, baseWallet, wallet])
  const writeAccess = useMemo(() => createWriteAccess(runtimeConfig, liveDuskDomainsApp, pause), [runtimeConfig, liveDuskDomainsApp, pause])
  const onChainReadTransport = useMemo(() => (
    liveDuskDomainsApp
      ? createDuskDomainsOnChainReadTransport(liveDuskDomainsApp, runtimeConfig.contracts)
      : null
  ), [liveDuskDomainsApp, runtimeConfig.contracts])
  // The market new orders go to, read from the directory, and the markets whose orders the site still serves.
  const market = usePoolMarketplace(onChainReadTransport)
  const marketplaceContractId = market.preferred
  const configuredMarketplace = runtimeConfig.contracts.marketplace?.contractId
  const knownMarketplaces = useMemo(() => [...new Set([...market.known, ...(configuredMarketplace ? [configuredMarketplace] : [])])], [market.known, configuredMarketplace])
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
    writeAccess,
    pause,
    walletOpen,
    connectKit,
    connectOptions: duskDomainsConnectOptions,
    duskDomainsOnChainClient,
    getCurrentBlockHeight,
    indexerClient,
    liveDuskDomainsApp,
    marketplaceContractId,
    knownMarketplaces,
    marketplaceOnChainClient,
    recordSourceContractId,
    runtimeConfig,
    wallet,
  }
}
