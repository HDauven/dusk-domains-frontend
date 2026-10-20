/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { parseEnv } from 'node:util'
import { MULTICALL_CONTRACT_ID, hash, hex, loadDataDriver, stringifyJson, verifyArtifact, wireValue, type ContractRole } from '@duskdomains/sdk'

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
/** A contract read as the handoff node answers it: a verification read, in the drivers' encoding. */
function verificationReply(id: string, method: string, kinds: Record<string, string>): Uint8Array | undefined {
  if (method !== 'interface_version' && method !== 'binding') return undefined
  const role = kinds[id] ?? handoff.contracts.find((c: { id: string }) => c.id === id)?.key
  if (!role) return undefined
  if (method === 'binding') return Uint8Array.from([...handoff.binding.directory, ...handoff.binding.vault, 0])
  const store = role === 'store', custody = store || role === 'marketplace'
  return Uint8Array.from([contractKinds.indexOf(role), 0, 1, 0, store ? 1 : 0, 0, custody ? 1 : 0, 0])
}
/** The calls a Multicall for Dusk envelope makes (rkyv 0.7 `Vec<Call>`, `size_32`): each callee and function. */
function aggregateCalls(bytes: Uint8Array): { contract: string; fn: string }[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    root = bytes.length - 8,
    array = root + view.getInt32(root, true)
  return Array.from({ length: view.getUint32(root + 4, true) }, (_, i) => {
    const slot = array + 56 * i,
      last = bytes[slot + 39],
      name = (last & 0x80) === 0
        ? bytes.subarray(slot + 32, slot + 32 + last)
        : bytes.subarray(slot + 32 + view.getInt32(slot + 36, true), slot + 32 + view.getInt32(slot + 36, true) + view.getUint32(slot + 32, true))
    return { contract: hex(bytes.subarray(slot, slot + 32)), fn: new TextDecoder().decode(name) }
  })
}
/** The multicall's reply (rkyv `Aggregate`): every call's bytes, then the result slots, then the height. */
function aggregateReply(height: bigint, replies: Uint8Array[]): Uint8Array {
  const at: number[] = []
  let length = 0
  for (const r of replies) {
    at.push(length)
    length += r.length
  }
  const slots = Math.ceil(length / 4) * 4,
    root = Math.ceil((slots + 16 * replies.length) / 8) * 8,
    out = new Uint8Array(root + 16),
    view = new DataView(out.buffer)
  replies.forEach((r, i) => {
    out.set(r, at[i])
    const slot = slots + 16 * i
    view.setInt32(slot + 4, at[i] - (slot + 4), true)
    view.setUint32(slot + 8, r.length, true)
  })
  view.setBigUint64(root, height, true)
  view.setInt32(root + 8, slots - (root + 8), true)
  view.setUint32(root + 12, replies.length, true)
  return out
}
const nodeRead = (url: URL) =>
  url.origin === new URL(handoff.nodeUrl).origin ? /^\/on\/contracts:([a-f\d]{64})\/(\w+)$/.exec(url.pathname) : null
const envelope = (body: BodyInit | null | undefined) => (body instanceof Uint8Array ? body : new Uint8Array(body as ArrayBuffer))
/** The contract reads a request to the handoff node makes, as `<function>`: one, or a multicall query's every call. */
export function nodeCalls(url: URL, body?: BodyInit | null): string[] {
  const read = nodeRead(url)
  if (!read) return []
  return read[1] === MULTICALL_CONTRACT_ID && read[2] === 'aggregate' ? aggregateCalls(envelope(body)).map((c) => c.fn) : [read[2]]
}
/**
 * The handoff node's answer to a verification read, in the drivers' encoding: a contract's interface,
 * as `kinds` says (its handoff role by default), and the handoff's deployment binding. A multicall query
 * (`aggregate`, its envelope in `body`) is answered when the node answers each of its calls, at height 10.
 * Undefined for any other request, which a test's `fetch` refuses as unexpected.
 */
export function handoffNodeReply(url: URL, kinds: Record<string, string> = {}, body?: BodyInit | null): Response | undefined {
  const read = nodeRead(url)
  if (!read) return undefined
  const [, id, method] = read
  if (id === MULTICALL_CONTRACT_ID && method === 'aggregate') {
    const replies = aggregateCalls(envelope(body)).map((c) => verificationReply(c.contract, c.fn, kinds))
    return replies.every((r) => r !== undefined) ? new Response(aggregateReply(10n, replies as Uint8Array[]) as BodyInit) : undefined
  }
  const reply = verificationReply(id, method, kinds)
  return reply && new Response(reply as BodyInit)
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
