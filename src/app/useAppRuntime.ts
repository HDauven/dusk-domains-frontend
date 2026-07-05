import { useMemo } from 'react'
import { createDuskConnectKit } from '@dusk/connect/ui'
import { browserWriteProofUrlFromEnv } from './appEnv'
import { duskDomainsConnectOptions } from './appConstants'
import {
  canUseLiveDuskDomainsWrites,
  createDuskDomainsIndexerClient,
  createDuskDomainsLiveApp,
  createDuskDomainsRuntimeConfig,
  type DuskDomainsRuntimeEnv,
} from '../names/internal'

export function useAppRuntime(env: DuskDomainsRuntimeEnv) {
  const runtimeConfig = useMemo(() => createDuskDomainsRuntimeConfig(env), [env])
  const browserWriteProofUrl = useMemo(() => browserWriteProofUrlFromEnv(env), [env])
  const recordSourceContractId = runtimeConfig.contracts.core.contractId
  const indexerClient = useMemo(() => (
    runtimeConfig.indexerUrl ? createDuskDomainsIndexerClient({ baseUrl: runtimeConfig.indexerUrl }) : null
  ), [runtimeConfig.indexerUrl])
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
  return {
    browserWriteProofUrl,
    connectKit,
    connectOptions: duskDomainsConnectOptions,
    indexerClient,
    liveDuskDomainsApp,
    recordSourceContractId,
    runtimeConfig,
    wallet,
  }
}
