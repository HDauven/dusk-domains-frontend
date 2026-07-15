import { createDuskApp } from '@dusk/connect'
import type { DuskApp, DuskWallet, DuskWalletOptions } from '@dusk/connect'
import {
  isPlaceholderContractId,
  type DuskConnectAppLike,
  type DuskDomainContractPreset,
  type DuskDomainDecodedContext,
  type DuskDomainsRuntimeConfig,
} from '../names/internal'

type ContractCallParams = {
  contract: DuskDomainContractPreset
  functionName: string
  args?: unknown
  deposit?: string
  decodedContext?: DuskDomainDecodedContext
}

type WriteContractCallParams = ContractCallParams & {
  preparedCall?: unknown
}

type ConnectTransport = {
  readContract?: (params: ContractCallParams) => Promise<unknown>
  prepareContractCall?: (params: ContractCallParams) => Promise<unknown>
  writeContract?: (params: WriteContractCallParams) => Promise<unknown>
  request?: (request: { method: string; params?: unknown }) => Promise<unknown>
}

type DuskDomainsLiveAppOptions = {
  runtimeConfig: DuskDomainsRuntimeConfig
  wallet?: DuskWallet | DuskWalletOptions
  autoConnect?: boolean
}

type DuskDomainsLiveApp = {
  dusk: DuskApp
  names: DuskConnectAppLike
}

const requestMethods = {
  readContract: 'dusk_readContract',
  prepareContractCall: 'dusk_prepareContractCall',
  writeContract: 'dusk_sendTransaction',
} as const

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
    chain: { chainId: options.runtimeConfig.chainId },
    autoConnect: options.autoConnect ?? true,
    contracts: options.runtimeConfig.contracts,
  })

  return {
    dusk,
    names: createDuskDomainsConnectApp(dusk),
  }
}

function createDuskDomainsConnectApp(transport: ConnectTransport): DuskConnectAppLike {
  return {
    async readContract(params) {
      if (transport.readContract) return await transport.readContract(readContractParams(params))
      return await requestTransport(transport, requestMethods.readContract, readContractParams(params))
    },
    async prepareContractCall(params) {
      if (transport.prepareContractCall) return await transport.prepareContractCall(contractParams(params))
      return await requestTransport(transport, requestMethods.prepareContractCall, contractParams(params))
    },
    async writeContract(params) {
      if (transport.writeContract) return await transport.writeContract(writeContractParams(params))
      return await requestTransport(transport, requestMethods.writeContract, sendTransactionParams(params))
    },
  }
}

function readContractParams(params: ContractCallParams) {
  const callParams = { ...params }
  delete callParams.decodedContext
  return callParams
}

function contractParams(params: ContractCallParams) {
  const callParams = { ...params }
  delete callParams.decodedContext

  return {
    privacy: 'public',
    ...callParams,
    display: params.decodedContext,
  }
}

function writeContractParams(params: WriteContractCallParams) {
  const callParams = { ...params }
  delete callParams.preparedCall
  return contractParams(callParams)
}

function sendTransactionParams(params: WriteContractCallParams) {
  if (!isObjectRecord(params.preparedCall)) {
    throw new Error('Prepared contract-call payload is required for dusk_sendTransaction.')
  }

  return {
    kind: 'contract_call',
    ...params.preparedCall,
    deposit: params.preparedCall.deposit ?? params.deposit,
    display: params.preparedCall.display ?? params.decodedContext,
  }
}

async function requestTransport(
  transport: ConnectTransport,
  method: string,
  params: ContractCallParams | WriteContractCallParams | Record<string, unknown>,
) {
  if (!transport.request) {
    throw new Error('Dusk Connect transport does not expose contract-call methods or request fallback.')
  }

  return await transport.request({
    method,
    params,
  })
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
