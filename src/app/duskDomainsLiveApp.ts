import { ContractRefusedError, createClientFromManifest, contractId, WriteBalanceError, type ContractRole, type FrozenCall, type FrozenClient, type LensFallback, type VerificationCache } from '@duskdomains/sdk'
import { createDuskDomainsConnectApp } from '@duskdomains/sdk/connect-app'
import type { DuskWallet } from '@dusk/connect'
import { createSessionWriteWallet } from '../features/wallet/sessionWriteWallet'
import type { DuskWalletLike } from '../features/wallet/walletSessionTypes'
import { roles } from '../names/config'
import { configuredReleaseManifest } from '../names/releaseManifest'
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

/** Whether a failure is, or was caused by, a client refusing a contract: that client refuses it for good. */
export function isContractRefusal(error: unknown): boolean {
  for (let cause = error, depth = 0; cause && depth < 4; cause = (cause as { cause?: unknown }).cause, depth++)
    if (cause instanceof ContractRefusedError || (cause as Error).name === 'ContractRefusedError') return true
  return false
}

/**
 * The client as the app reads through it. Each operation verifies the contracts it reads through the
 * first time, so a refusal can come from any of them, a contract's read scope included: it discards the
 * client (`refused`), and the next read builds a fresh one on the manifest published then.
 */
function watchRefusals(client: FrozenClient, refused: () => void): FrozenClient {
  const settle = (result: unknown) =>
    result instanceof Promise
      ? result.catch((error: unknown) => {
          if (isContractRefusal(error)) refused()
          throw error
        })
      : result
  const scope = (api: object) =>
    new Proxy(api, {
      get(target, key) {
        const value: unknown = Reflect.get(target, key)
        return typeof value === 'function' ? (...args: unknown[]) => settle(value.apply(target, args)) : value
      },
    })
  return new Proxy(client, {
    get(target, key) {
      const value: unknown = Reflect.get(target, key, target)
      if (key === 'directory' || key === 'vault') return scope(value as object)
      if (typeof value !== 'function') return value
      return (...args: unknown[]) => {
        const result: unknown = value.apply(target, args)
        // store(id), resolver(id), policy(id) and marketplace(id) return that contract's read scope.
        return result && typeof result === 'object' && !(result instanceof Promise) ? scope(result) : settle(result)
      }
    },
  })
}

/**
 * Before Connect prepares or signs a call, its target is verified with the client that signs. A lens
 * read verifies nothing, so the store of a name read through the lens is unverified until then, and
 * Connect signs only for contracts its client verified. A contract verified already is not read again.
 */
async function verifyTarget(client: FrozenClient, call: FrozenCall) {
  await client.verifyContract(call.role, call.contractId)
}

/** Verification replies kept for the tab's session; none where session storage is unavailable. */
function sessionVerificationCache(): VerificationCache | undefined {
  try {
    return globalThis.sessionStorage ?? undefined
  } catch {
    return undefined
  }
}

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
  // reload. A client that refuses a contract refuses it for good, so it is discarded then too. Readers
  // that still hold it are told, and drop what they read from it.
  const discard = (created: ClientPromise) => {
    if (current?.promise !== created) return
    current = undefined
    globalThis.dispatchEvent?.(new Event(CLIENT_RESET_EVENT))
  }
  // A read the lens could not answer was read directly; each kind is reported once, and so is the lens
  // going off: for the client (its deployment check failed, or its driver didn't load) or for one method.
  const fellBack = new Set<string>()
  const onLensFallback = ({ method, reason, error, disabled }: LensFallback) => {
    const kind = `${method}:${reason}:${disabled}`
    if (fellBack.has(kind)) return
    fellBack.add(kind)
    console.warn(disabled
      ? `The read lens is off for ${reason === 'deployment' ? 'this page' : method} (${reason}): reading directly.`
      : `Read ${method} directly: the read lens could not answer it (${reason}).`, error)
  }
  const client = (): ClientPromise => {
    if (current) return current.promise
    const entry: Created = { promise: undefined as unknown as ClientPromise }
    const created: ClientPromise = configuredReleaseManifest(config, origin)
      .then(async (manifest) => createClientFromManifest(manifest, {
        artifactBaseUrl: origin + '/',
        nodeUrl: config.nodeUrl,
        indexerUrl: new URL(config.indexerUrl!, origin).href,
        // A contract's interface, binding and order API never change: the tab keeps what verification
        // read for its session. The SDK checks a kept reply again, and signs only after reading it anew.
        verificationCache: sessionVerificationCache(),
        // Only a lens this build pins is in the release; without one every read is direct.
        useLens: Boolean(config.lens),
        onLensFallback,
        // A contract admitted after this release, such as the policy a SetPolicy proposal selects,
        // loads only once the operator republishes the reviewed manifest listing it (docs/deploy.md).
        resolveContract: async (role: ContractRole, id: string) => {
          if (!config.manifestUrl) throw new UnlistedContractError(role, id)
          const manifest = await configuredReleaseManifest(config, origin)
          const artifact = manifest.contracts.find((c) => c.contractId === id)
          if (!artifact || artifact.role !== role) throw new UnlistedContractError(role, id)
          return artifact
        },
      }))
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
        const watched = watchRefusals(client, () => discard(created))
        entry.client = watched
        return watched
      })
      .catch((e) => {
        discard(created)
        throw e
      })
    entry.promise = created
    current = entry
    return created
  }
  // Connect verifies a contract the client verified from its cache again from the chain before signing,
  // and a refusal it meets there is the client's too: the client is discarded as for any other.
  const signing = async <T>(c: FrozenClient, sign: () => Promise<T>) => {
    try {
      return await sign()
    } catch (error) {
      if (isContractRefusal(error) && current?.client === c) discard(current.promise)
      throw error
    }
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
      const call = frozenPayload(params.args)
      await verifyTarget(c, call)
      const prepared = await signing(c, () => createDuskDomainsConnectApp(options.wallet, c.release).prepare(call))
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
        const call = frozenPayload(params.args)
        await verifyTarget(c, call)
        return await signing(c, () => createDuskDomainsConnectApp(wallet, c.release, {
          gasPrice: params.gas?.price === undefined ? undefined : BigInt(params.gas.price),
        }).submit(call))
      } finally {
        wallet.destroy()
      }
    },
  }
  return { names }
}
