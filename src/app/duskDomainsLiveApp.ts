import { createClientFromManifest, contractId, WriteBalanceError } from '@duskdomains/sdk'
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
  let pending: ReturnType<typeof createClientFromManifest> | undefined
  const client = () =>
    (pending ??= configuredReleaseManifest(config, origin)
      .then((manifest) =>
        createClientFromManifest(manifest, {
          artifactBaseUrl: origin + '/',
          nodeUrl: config.nodeUrl,
          indexerUrl: new URL(config.indexerUrl!, origin).href,
          resolveContract: async (role, id) => {
            if (!config.manifestUrl)
              throw new Error('This shard requires the updated deployment manifest.')
            const manifest = await configuredReleaseManifest(config, origin)
            const artifact = manifest.contracts.find((c) => c.contractId === id)
            if (!artifact || artifact.role !== role)
              throw new Error('The deployment manifest does not include this admitted contract.')
            return artifact
          },
        }),
      )
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
        return client
      })
      .catch((e) => {
        pending = undefined
        throw e
      }))
  const names: DuskConnectAppLike = {
    get chainId() {
      return options.wallet.state.chainId ?? undefined
    },
    get client() {
      return client()
    },
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
