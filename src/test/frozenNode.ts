/// <reference types="node" />
import { readFileSync } from 'node:fs'
import * as sdk from '@duskdomains/sdk'
import { handoffDrivers } from './handoffFixtures'

const samples = sdk.parseJson(readFileSync('src/test/frozen-wire.json', 'utf8')) as Record<string, unknown>
const sample = <T extends keyof sdk.WireTypes>(type: T): sdk.WireTypes[T] =>
  sdk.wireValue(type, structuredClone(samples[type]))
export const id = (n: number) => n.toString(16).padStart(2, '0').repeat(32)
export const bytes = (n: number) => Array<number>(32).fill(n)
const encode = (value: unknown) => new TextEncoder().encode(sdk.stringifyJson(value))
const drivers = await handoffDrivers()

export type NodeCall = { kind: 'height' } | { kind: 'read'; target: string; method: string; args: unknown }

/**
 * A frozen deployment on a fake node: directory 1, policy 2, stores 3 and 7 (ordinals 0 and 1),
 * vault 4, resolver 5 and market 6, with example.dusk at home in store 3. Inputs are encoded by the
 * handoff drivers; replies are JSON, decoded by the release's drivers. Tests change the state, the
 * height or single replies, and read the node's call log.
 */
export function frozenNode() {
  const roles = [['directory', 1], ['policy', 2], ['store', 3], ['vault', 4], ['resolver', 5], ['marketplace', 6], ['store', 7]] as const
  const role = new Map<string, sdk.ContractRole>(roles.map(([r, n]) => [id(n), r]))
  const binding = { directory: bytes(1), vault: bytes(4), network: 0 }
  const directory = sample('DirectoryConfig')
  directory.binding = binding
  directory.store_count = 2
  directory.resolver_count = 1
  directory.registration.policy = bytes(2)
  directory.registration.newest_store = bytes(7)
  directory.preferred_marketplace = bytes(6)
  const admissions = [3, 7].map((n, ordinal) => ({ ...sample('Admission'), id: bytes(n), ordinal, retiring: false, admitted_at: 1n }))
  const view = sample('NameView')
  view.name.key = sdk.nameKey('example.dusk')
  view.name.label = 'example'
  view.name.incarnation = { generation: 7n, serial: 1n }
  view.name.owner = bytes(9)
  view.name.manager = bytes(9)
  view.name.custody = null
  view.name.expires_at = 5000n
  view.name.grace_end = 6000n
  view.active = true
  view.move_pending = null
  const website: sdk.RecordValue = { key: 'website', value: [...new TextEncoder().encode('https://example.test')], ttl_seconds: 300n, updated_at: 90n }
  const renewal = sample('RenewalQuote')
  renewal.total_lux = '17000000000'
  const state: {
    height: bigint
    view: sdk.NameView
    records: sdk.RecordValue[]
    homes: Map<string, sdk.Home>
    names: Map<string, () => sdk.Located<sdk.NameView>>
  } = {
    height: 100n,
    view,
    records: [website],
    // Each store's home for example.dusk's root, and what get_name finds there.
    homes: new Map<string, sdk.Home>([[id(3), 'Local'], [id(7), 'Absent']]),
    names: new Map<string, () => sdk.Located<sdk.NameView>>([[id(3), () => ({ Local: state.view })], [id(7), () => 'Absent']]),
  }
  const calls: NodeCall[] = []
  // `${contract}:${method}` replies that fail once, as a node refusing a read does.
  const failNext = new Set<string>()
  // Runs before each reply: a test moves the tip or holds a reply here.
  let before: (call: NodeCall) => void | Promise<void> = () => {}
  const transport: sdk.ReadTransport = {
    async currentBlockHeight() {
      const call: NodeCall = { kind: 'height' }
      calls.push(call)
      await before(call)
      return state.height
    },
    async read(target, method, input) {
      const args = drivers.get(role.get(target)!)!.decodeInput(method, input)
      const call: NodeCall = { kind: 'read', target, method, args }
      calls.push(call)
      await before(call)
      if (failNext.delete(`${target}:${method}`)) throw new Error(`Contract read failed (${target}.${method}): refused`)
      const kind = role.get(target)!
      if (method === 'interface_version')
        return encode({
          kind: kind[0].toUpperCase() + kind.slice(1),
          version: 1,
          move_version: kind === 'store' ? 1 : 0,
          custody_version: kind === 'store' || kind === 'marketplace' ? 1 : 0,
        })
      if (method === 'binding') return encode(binding)
      if (method === 'order_api_version') return encode(1)
      if (method === 'config' && kind === 'directory') return encode(directory)
      if (method === 'members')
        return encode({
          rows: (args as { kind: string }).kind === 'Store' ? admissions : [{ ...sample('Admission'), id: bytes(5), ordinal: 0 }],
          next: null,
        })
      if (method === 'allocation') return encode({ version: 1n, newest_store: bytes(7), newest_resolver: bytes(5) })
      if (method === 'home') return encode(state.homes.get(target) ?? 'Absent')
      if (method === 'get_name') return encode(state.names.get(target)?.() ?? 'Absent')
      if (method === 'read_records') return encode({ Local: { pointer: null, records: state.records } })
      if (method === 'quote_renewal') return encode({ Local: renewal })
      throw new Error(`Unexpected read ${target}.${method}`)
    },
  }
  const release = (): sdk.LoadedRelease => {
    const entries = roles.map(([r, n]) => ({ role: r, contractId: id(n), dataDriver: { path: `/${r}.wasm`, sha256: '00'.repeat(32) } }))
    return {
      manifest: { chainId: 'dusk:0', network: 0, nodeUrl: 'http://node.invalid', indexerUrl: 'http://indexer.invalid', contracts: entries },
      contracts: new Map(entries.map((c) => [c.contractId, c])),
      drivers: new Map(entries.map((c) => [c.contractId, {
        ...drivers.get(c.role)!,
        decodeOutput: (_: string, reply: Uint8Array) => sdk.parseJson(new TextDecoder().decode(reply)),
      }])),
      artifactBaseUrl: 'http://release.invalid/',
    }
  }
  const forward = (destination: number, ordinal: number): sdk.Home => ({
    Forwarded: { root: view.name.key.root, destination: bytes(destination), destination_ordinal: ordinal, move_id: bytes(9), generation: 7n, completed_at: 50n },
  })
  return {
    state,
    calls,
    failNext,
    transport,
    forward,
    /** A client of its own release over `transport` (the node itself by default). */
    client: (over: sdk.ReadTransport = transport, options: sdk.ClientOptions = {}) => new sdk.FrozenClient(release(), { ...options, transport: over }),
    onCall: (hook: typeof before) => { before = hook },
    /** How often the node was asked for `method`: a contract method, or `height` for the tip. */
    count: (method: string) => calls.filter((c) => (c.kind === 'height' ? 'height' : c.method) === method).length,
    reads: () => calls.filter((c): c is Extract<NodeCall, { kind: 'read' }> => c.kind === 'read').map((c) => c.method),
  }
}
