import { useMemo } from 'react'
import { createDuskConnectKit } from '@dusk/connect/ui'
import { browserWriteProofUrlFromEnv } from './appEnv'
import { duskDomainsConnectOptions } from './appConstants'
import {
  canUseLiveDuskNamesWrites,
  createDuskNamesIndexerClient,
  createDuskNamesLiveApp,
  createDuskNamesRuntimeConfig,
  type DuskNamesRuntimeEnv,
} from '../names/internal'

export function useAppRuntime(env: DuskNamesRuntimeEnv) {
  const runtimeConfig = useMemo(() => createDuskNamesRuntimeConfig(env), [env])
  const browserWriteProofUrl = useMemo(() => browserWriteProofUrlFromEnv(env), [env])
  const recordSourceContractId = runtimeConfig.contracts.core.contractId
  const indexerClient = useMemo(() => (
    runtimeConfig.indexerUrl ? createDuskNamesIndexerClient({ baseUrl: runtimeConfig.indexerUrl }) : null
  ), [runtimeConfig.indexerUrl])
  const connectKit = useMemo(() => createDuskConnectKit({
    modal: {
      appName: 'Dusk Domains',
      theme: 'dark',
      connectOptions: duskDomainsConnectOptions,
    },
  }), [])
  const wallet = connectKit.wallet
  const liveDuskNamesApp = useMemo(() => (
    canUseLiveDuskNamesWrites(runtimeConfig)
      ? createDuskNamesLiveApp({ runtimeConfig, wallet, autoConnect: false }).names
      : null
  ), [runtimeConfig, wallet])
  return {
    browserWriteProofUrl,
    connectKit,
    connectOptions: duskDomainsConnectOptions,
    indexerClient,
    liveDuskNamesApp,
    recordSourceContractId,
    runtimeConfig,
    wallet,
  }
}
