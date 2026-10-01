import { createWriteAccess } from './writeAccess'
import { useMemo, useState } from 'react'
import { useOperatorPause } from './useOperatorPause'
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
  const runtimeConfig = useMemo(() => createDuskDomainsRuntimeConfig(env), [env])
  const recordSourceContractId = runtimeConfig.contracts.core.contractId
  const indexerClient = useMemo(() => (
    runtimeConfig.indexerUrl ? createHealthyIndexerClient(runtimeConfig.indexerUrl) : null
  ), [runtimeConfig.indexerUrl])
  const pause = useOperatorPause(indexerClient, `${runtimeConfig.chainId}:${runtimeConfig.contracts.router.contractId}`)
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
      ? createDuskDomainsLiveApp({ runtimeConfig, wallet: baseWallet, autoConnect: false }).names
      : null
  ), [runtimeConfig, baseWallet])
  const writeAccess = useMemo(() => createWriteAccess(runtimeConfig, liveDuskDomainsApp, pause), [runtimeConfig, liveDuskDomainsApp, pause])
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
    writeAccess,
    pause,
    walletOpen,
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
