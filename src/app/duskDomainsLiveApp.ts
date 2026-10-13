import { createClientFromManifest, contractId, FrozenClient, loadReleaseManifest, WriteBalanceError, type ContractRole } from '@duskdomains/sdk'
import { createDuskDomainsConnectApp } from '@duskdomains/sdk/connect-app'
import type { DuskWallet } from '@dusk/connect'
import { createSessionWriteWallet } from '../features/wallet/sessionWriteWallet'
import type { DuskWalletLike } from '../features/wallet/walletSessionTypes'
import { roles } from '../names/config'
import { configuredReleaseManifest } from '../names/releaseManifest'
import { discoverWithoutPolicy } from '../names/directoryMembers'
import { prepareFrozenCall } from '../names/prepareFrozenCall'
import { checkPublicBalanceForWrite, frozenPayload } from '../names/transactions'
import {
  isPlaceholderContractId,
  type DuskConnectAppLike,
  type DuskDomainsRuntimeConfig,
} from '../names/internal'
const unlistedRoles: Partial<Record<ContractRole, string>> = {
  policy: 'the new registration prices',
  store: 'a new Dusk Domains shard',
  resolver: 'a new Dusk Domains record shard',
  marketplace: 'the new marketplace',
}

/** The chain uses a contract this site's deployment manifest does not list yet. */
export class UnlistedContractError extends Error {
  readonly role: ContractRole
  readonly contractId: string
  constructor(role: ContractRole, contractId: string) {
    super(`This site has not been updated for ${unlistedRoles[role] ?? 'this Dusk Domains deployment'} yet. Try again later.`)
    this.name = 'UnlistedContractError'
    this.role = role
    this.contractId = contractId
  }
}

/** Dispatched on the window when the live app discards its client, so readers drop what it gave them. */
export const CLIENT_RESET_EVENT = 'dusk-domains:client-reset'

export function canUseLiveDuskDomainsWrites(config: DuskDomainsRuntimeConfig): boolean {
  return (
    config.liveWritesEnabled &&
    config.mode === 'live_ready' &&
    roles.every((role) => !isPlaceholderContractId(config.contracts[role]!.contractId))
  )
}
export function createDuskDomainsLiveApp(options: {
  runtimeConfig: DuskDomainsRuntimeConfig
  wallet: DuskWallet
  session: Pick<DuskWalletLike, 'state'>
  autoConnect?: boolean
}) {
  if (!canUseLiveDuskDomainsWrites(options.runtimeConfig))
    throw new Error('Dusk Domains live writes require configured contract IDs and live writes enabled.')
  const config = options.runtimeConfig,
    origin = globalThis.location?.origin ?? 'http://localhost'
  type ClientPromise = ReturnType<typeof createClientFromManifest>
  type Created = { promise: ClientPromise; client?: Awaited<ClientPromise> }
  let current: Created | undefined
  // A client is created again after a failure, so a fixed manifest or contract takes effect without a
  // reload. A contract that fails verification can leave its descriptor and driver in the client's
  // release, which signing trusts, so the whole client and release are discarded then too. Readers
  // that still hold it are told, and drop what they read from it.
  const discard = (created: ClientPromise) => {
    if (current?.promise !== created) return
    current = undefined
    globalThis.dispatchEvent?.(new Event(CLIENT_RESET_EVENT))
  }
  const client = (): ClientPromise => {
    if (current) return current.promise
    const entry: Created = { promise: undefined as unknown as ClientPromise }
    const created: ClientPromise = configuredReleaseManifest(config, origin)
      .then(async (manifest) => {
        const clientOptions = {
          artifactBaseUrl: origin + '/',
          nodeUrl: config.nodeUrl,
          indexerUrl: new URL(config.indexerUrl!, origin).href,
          // A contract admitted after this release, such as the policy a SetPolicy proposal selects,
          // loads only once the operator republishes the reviewed manifest listing it (docs/deploy.md).
          resolveContract: async (role: ContractRole, id: string) => {
            if (!config.manifestUrl) throw new UnlistedContractError(role, id)
            const manifest = await configuredReleaseManifest(config, origin)
            const artifact = manifest.contracts.find((c) => c.contractId === id)
            if (!artifact || artifact.role !== role) throw new UnlistedContractError(role, id)
            return artifact
          },
        }
        try {
          return await createClientFromManifest(manifest, clientOptions)
        } catch (error) {
          // SDK 0.3.2 discovers the policy the directory selects too, and only registration uses it.
          // Until the manifest lists a policy a SetPolicy selected, everything else is discovered
          // without it, and registration refuses with UnlistedContractError when it quotes.
          if (!(error instanceof UnlistedContractError && error.role === 'policy')) throw error
          const client = new FrozenClient(await loadReleaseManifest(manifest, clientOptions), clientOptions)
          await discoverWithoutPolicy(client)
          return client
        }
      })
      .then((client) => {
        if (
          client.release.manifest.chainId !== config.chainId ||
          roles.some(
            (role) =>
              client.release.contracts.get(contractId(config.contracts[role]!.contractId))?.role !==
              role,
          )
        )
          throw new Error('Deployment manifest does not match the configured network and contracts.')
        const verify = client.verifyContract.bind(client)
        client.verifyContract = async (...args) => {
          try {
            return await verify(...args)
          } catch (error) {
            // A contract the manifest doesn't list never enters the release, so the client stays.
            if (!(error instanceof UnlistedContractError)) discard(created)
            throw error
          }
        }
        entry.client = client
        return client
      })
      .catch((e) => {
        discard(created)
        throw e
      })
    entry.promise = created
    current = entry
    return created
  }
  const names: DuskConnectAppLike = {
    get chainId() {
      return options.wallet.state.chainId ?? undefined
    },
    get client() {
      return client()
    },
    isCurrentClient: (candidate) => Boolean(current?.client && current.client === candidate),
    async readContract(params) {
      const c = await client()
      if (params.functionName === 'config') {
        const config = await c.directory.config()
        return { ...config, marketplace: config.preferred_marketplace }
      }
      throw new Error('Use FrozenClient for canonical reads')
    },
    async prepareIntent(request, name) {
      const account = options.session.state.selectedProfile?.account
      if (!account) throw new Error('Connect your wallet')
      return prepareFrozenCall(await client(), request, name, account)
    },
    async prepareContractCall(params) {
      const c = await client()
      const prepared = await createDuskDomainsConnectApp(options.wallet, c.release).prepare(frozenPayload(params.args))
      const balance = await options.wallet.getPublicBalance()
      const funds = checkPublicBalanceForWrite({ balanceLux: balance?.value, prepared, action: params.functionName })
      if (!funds.ok) throw new WriteBalanceError(funds)
      return prepared
    },
    async writeContract(params) {
      const wallet = createSessionWriteWallet(
        options.wallet,
        options.session,
        config.chainId,
        config.nodeUrl,
        params.display,
      )
      try {
        const c = await client()
        return await createDuskDomainsConnectApp(wallet, c.release, {
          gasPrice: params.gas?.price === undefined ? undefined : BigInt(params.gas.price),
        }).submit(frozenPayload(params.args))
      } finally {
        wallet.destroy()
      }
    },
  }
  return { names }
}
