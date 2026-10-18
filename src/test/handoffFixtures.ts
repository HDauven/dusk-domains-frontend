/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { parseEnv } from 'node:util'
import { hash, hex, loadDataDriver, stringifyJson, verifyArtifact, wireValue, type ContractRole } from '@duskdomains/sdk'

export const handoff = JSON.parse(readFileSync('src/test/handoff/manifest.json', 'utf8'))
export const handoffEnv = parseEnv(readFileSync('src/test/handoff/frontend.env', 'utf8'))
export function handoffDriver(role: ContractRole): Uint8Array {
  const artifact = handoff.artifacts[role].driver
  const bytes = new Uint8Array(gunzipSync(readFileSync(`src/test/handoff/${artifact.path}.gz`)))
  verifyArtifact(bytes, artifact)
  return bytes
}
export async function handoffDrivers() {
  return new Map(
    await Promise.all(
      (Object.keys(handoff.artifacts) as ContractRole[]).map(
        async (role) => [role, await loadDataDriver(handoffDriver(role))] as const,
      ),
    ),
  )
}

const contractKinds = ['directory', 'store', 'resolver', 'vault', 'policy', 'marketplace']
/**
 * The handoff node's answer to a verification read, in the drivers' encoding: a contract's interface,
 * as `kinds` says (its handoff role by default), and the handoff's deployment binding. Undefined for
 * any other request.
 */
export function handoffNodeReply(url: URL, kinds: Record<string, string> = {}): Response | undefined {
  const read = /^\/on\/contracts:([a-f\d]{64})\/(interface_version|binding)$/.exec(url.pathname)
  if (!read || url.origin !== new URL(handoff.nodeUrl).origin) return undefined
  const [, id, method] = read
  const role = kinds[id] ?? handoff.contracts.find((c: { id: string }) => c.id === id)?.key
  if (!role) return undefined
  if (method === 'binding') return new Response(Uint8Array.from([...handoff.binding.directory, ...handoff.binding.vault, 0]))
  const store = role === 'store', custody = store || role === 'marketplace'
  return new Response(Uint8Array.from([contractKinds.indexOf(role), 0, 1, 0, store ? 1 : 0, 0, custody ? 1 : 0, 0]))
}

/** The read lens's reviewed driver, which the handoff manifest doesn't list. */
export const lensArtifact = {
  path: 'contracts/dusk-domains-lens.63198ec4b085d2c97b571adf77eecf9f49a2a5663dd4470d0c0e96a3ec8779ad.data-driver.wasm',
  sha256: '63198ec4b085d2c97b571adf77eecf9f49a2a5663dd4470d0c0e96a3ec8779ad',
}
export function lensDriver(): Uint8Array {
  const bytes = new Uint8Array(gunzipSync(readFileSync(`src/test/handoff/${lensArtifact.path}.gz`)))
  verifyArtifact(bytes, lensArtifact)
  return bytes
}
export const lensId = '9a'.repeat(32)
/** The env lines frontend.env pins the lens with. */
export const lensEnv = {
  VITE_DUSK_DOMAINS_LENS_CONTRACT_ID: `0x${lensId}`,
  VITE_DUSK_DOMAINS_LENS_DRIVER_URL: `/${lensArtifact.path}`,
}
/**
 * The handoff with a read lens bound to its directory, as the deploy tool writes it: the lens's top-level
 * deployment beside the six roles, and its driver in `artifacts.lens`.
 */
export async function handoffWithLens() {
  const manifest = structuredClone(handoff)
  const directory = handoff.binding.directory as number[]
  const init = { directory }
  const archive = (await loadDataDriver(lensDriver())).encodeInput('init', stringifyJson(wireValue('InitLens' as never, init as never)))
  manifest.lens = {
    key: 'lens', crate: 'dusk-domains-lens', kind: 'Lens', deployNonce: '6', id: lensId, codeHash: 'fe64a751a435ffc5e5bf176f152fd87135816909ebd32b34451793e91a893b75',
    init, initArchive: hex(archive), initHash: hex(hash('duskds:init:v1', archive)),
    receipt: { blockHeight: 10, err: null }, txId: 'd2'.repeat(32), accountNonce: '7', initEvents: [],
    verification: { binding: handoff.binding, interface: { version: 1, max_stores: 64, max_hops: 63, max_record_keys: 16 }, bootstrapHeight: 10, pricingHeight: 10 },
  }
  manifest.artifacts.lens = {
    wasm: { path: 'wasm/dusk-domains-lens.f4a862456d87b8b90f7ad3c6b783223a41fd9add8dd612733203fac14feb5340.wasm', sha256: 'f4a862456d87b8b90f7ad3c6b783223a41fd9add8dd612733203fac14feb5340' },
    driver: { ...lensArtifact },
  }
  return manifest
}
