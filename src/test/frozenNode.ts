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
const decode = (value: Uint8Array) => sdk.parseJson(new TextDecoder().decode(value))
const drivers = await handoffDrivers()

export type NodeCall = { kind: 'height' } | { kind: 'read'; target: string; method: string; args: unknown }

/** The read lens of the fake deployment. */
export const LENS = id(8)
/** The lens's driver for the fake node, which answers in JSON. */
const lensDriver: sdk.DataDriver = {
  encodeInput: (_, json) => new TextEncoder().encode(json),
  decodeInput: (_, data) => decode(data),
  decodeOutput: (_, data) => decode(data),
  decodeEvent: (_, data) => decode(data),
  schema: () => ({}),
  version: () => '1.0.0',
}
const initCommitment = (driver: sdk.DataDriver, type: string, init: unknown) =>
  sdk.hex(sdk.hash('duskds:init:v1', driver.encodeInput('init', sdk.stringifyJson(sdk.wireValue(type as never, init as never)))))

/**
 * A frozen deployment on a fake node: directory 1, policy 2, stores 3 and 7 (ordinals 0 and 1),
 * vault 4, resolver 5 and market 6, at policy and market version 1, with example.dusk at home in
 * store 3. Its release commits to each contract's code and initialization and the directory's
 * records carry the same hashes, so a client verifies every contract as signable. With `lens`, the
 * release lists read lens 8, which answers from the same state as the lens ABI does. Inputs are
 * encoded by the handoff drivers; replies are JSON, decoded by the release's drivers. With
 * `blockHashes`, tips carry a block hash, as the SDK's HTTP transport reads them. `network` is the
 * deployment's chain, `dusk:<network>`. Tests change the state, the height or single replies, and read
 * the node's call log.
 */
export function frozenNode({ lens = false, blockHashes = false, network = 0 } = {}) {
  const roles = [['directory', 1], ['policy', 2], ['store', 3], ['vault', 4], ['resolver', 5], ['marketplace', 6], ['store', 7]] as const
  const role = new Map<string, sdk.ContractRole>(roles.map(([r, n]) => [id(n), r]))
  const binding = { directory: bytes(1), vault: bytes(4), network }
  const policy = sdk.launchPolicyConfig()
  // What the release commits each contract to, and the directory's records of them say. The policy and
  // the stores are the published v1 code, whose prices the SDK recomputes, as on testnet and mainnet.
  const codeHash = (n: number) => n === 2 ? 'c6a9d9013d8dc2c0e3415b8aafbcc1d5c91d275531d7e677ab3cff57b22de678'
    : n === 3 || n === 7 ? 'ab7c6e22b4bda3707cee67e584b0070b158821bf404d0da37c1b6c69f84094b2' : id(0x10 + n)
  const initHash = (n: number) => n === 2 ? initCommitment(drivers.get('policy')!, 'InitPolicy', { binding, config: policy }) : id(0x20 + n)
  const committed = (n: number) => ({ interface_version: 1, code_hash: sdk.fromHex(codeHash(n), 32), init_hash: sdk.fromHex(initHash(n), 32) })
  const directory = sample('DirectoryConfig')
  directory.binding = binding
  directory.store_count = 2
  directory.resolver_count = 1
  directory.registration.policy = bytes(2)
  directory.registration.policy_version = 1n
  directory.registration.newest_store = bytes(7)
  directory.registration.allocation_version = 1n
  directory.registration.operator_paused = false
  directory.registration.guardian_suspended = false
  directory.preferred_marketplace = bytes(6)
  directory.market_version = 1n
  // Renewals cost 17 DUSK a year for five or more characters.
  directory.renewal = { annual_lux: ['150000000000', '50000000000', '20000000000', '20000000000', '17000000000'], effective_at: 1n, referral_bps: 500, version: 1n }
  const admissions = [3, 7].map((n, ordinal) => ({ ...sample('Admission'), id: bytes(n), ordinal, retiring: false, admitted_at: 1n, ...committed(n) }))
  const resolvers = [{ ...sample('Admission'), id: bytes(5), ordinal: 0, retiring: false, admitted_at: 1n, ...committed(5) }]
  const market: sdk.Market = { id: bytes(6), state: 'Listed', version: 1n, ...committed(6) }
  const view = sample('NameView')
  view.name.key = sdk.nameKey('example.dusk')
  view.name.label = 'example'
  view.name.incarnation = { generation: 7n, serial: 1n }
  view.name.owner = bytes(9)
  view.name.manager = bytes(9)
  view.name.custody = null
  view.name.referrer = null
  view.name.subname = null
  view.name.expires_at = 5000n
  view.name.grace_end = 5000n + sdk.DEFAULT_GRACE_PERIOD_BLOCKS
  view.name.records = { resolver: bytes(5), epoch: 1n, count: 1, digest: bytes(9) }
  view.active = true
  view.move_pending = null
  const website: sdk.RecordValue = { key: 'website', value: [...new TextEncoder().encode('https://example.test')], ttl_seconds: 300n, updated_at: 90n }
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
  // Lens methods answered with a refusal, as a lens over a pool it can't prove does.
  const lensRefuses = new Set<string>()
  // Runs before each reply: a test moves the tip or holds a reply here.
  let before: (call: NodeCall) => void | Promise<void> = () => {}
  const quote = (store: number[], args: { node: number[]; label: string; actor: number[]; years: number }) => {
    const request: sdk.QuoteRequest = {
      version: 1, directory: bytes(1), store, node: args.node, label: args.label, actor: args.actor, years: args.years,
      height: state.height, previous_generation: 0n, previous_grace_end: null, policy_version: directory.registration.policy_version,
    }
    // The store prices as the policy's published curve does: the estimate without its marker and total.
    const priced: Record<string, unknown> = { ...sdk.estimateRegistrationQuote(policy, request) }
    const total_lux = priced.total_lux
    delete priced.estimate
    delete priced.total_lux
    return { request, quote: { policy: bytes(2), policy_version: request.policy_version, quote: priced, total_lux, height: state.height } }
  }
  // The lens ABI over the same state: the pool's evidence with every reply, at the tip's height.
  const lensAnswer = (method: string, args: Record<string, unknown>): unknown => {
    if (method === 'binding') return binding
    if (method === 'lens_interface') return { version: 1, max_stores: 64, max_hops: 63, max_record_keys: 16 }
    const height = state.height
    if (lensRefuses.has(method)) return { Refused: { code: 'GasBudget', contract: null, cause: null, height } }
    const evidence = (withResolver: boolean) => ({ stores: admissions, resolvers: withResolver ? resolvers : [] })
    // The root's home: the route from the hint, else from each store in admission order, to a Local home.
    const route = (start: string) => {
      const forwards: sdk.Forward[] = []
      for (let at = start; ;) {
        const home = state.homes.get(at) ?? 'Absent'
        if (typeof home !== 'object' || !('Forwarded' in home)) return { end: at, forwards, local: home === 'Local' }
        forwards.push(home.Forwarded)
        at = sdk.contractId(home.Forwarded.destination)
      }
    }
    const nameAt = (spelling: string, hint: unknown) => {
      const key = sdk.nameKey(spelling)
      const starts = [...(Array.isArray(hint) && role.get(sdk.contractId(hint as number[])) === 'store' ? [sdk.contractId(hint as number[])] : []), id(3), id(7)]
      const found = starts.map(route).find((at) => at.local)
      const located = found ? state.names.get(found.end)?.() ?? 'Absent' : 'Absent'
      const v = typeof located === 'object' && 'Local' in located && sdk.hex(located.Local.name.key.node) === sdk.hex(key.node) ? located.Local : undefined
      const root = sdk.hex(key.root) === sdk.hex(key.node)
      return {
        key, v, store: bytes(Number.parseInt((found?.end ?? id(7)).slice(0, 2), 16)), forwards: found?.forwards ?? [],
        name: v ? { Local: v } : 'Absent',
        status: !v ? 'Absent' : v.active ? 'Active' : root && v.renewable ? 'Grace' : root ? 'Released' : 'Expired',
      }
    }
    if (method === 'resolve') {
      const at = nameAt(args.name as string, args.hint), keys = args.record_keys as string[]
      const records = keys.map((key) => (at.v?.active ? state.records.find((r) => r.key === key) ?? null : null))
      return { Ok: { height, key: at.key, store: at.store, forwards: at.forwards, name: at.name, status: at.status, records, consulted: evidence(Boolean(at.v?.active && keys.length)) } }
    }
    if (method === 'name_page') {
      const at = nameAt(args.name as string, args.hint), v = at.v
      const primary = { endpoint: null, verified: null, is_primary: false, refused: null }
      if (!v)
        return { Ok: { height, key: at.key, store: at.store, forwards: at.forwards, name: at.name, status: at.status, records: null, primary, renewal: null, consulted: evidence(false) } }
      const schedule = directory.renewal, tier = Math.min(Math.max(new TextEncoder().encode(v.name.label).length, 1), 5) - 1
      let max = 0
      for (let years = 10; years >= 1 && height < v.name.grace_end; years--)
        if (v.name.expires_at + BigInt(years) * sdk.REGISTRATION_YEAR_BLOCKS <= height + sdk.MAX_REGISTRATION_AHEAD_BLOCKS) {
          max = years
          break
        }
      const root = sdk.hex(at.key.root) === sdk.hex(at.key.node)
      return {
        Ok: {
          height, key: at.key, store: at.store, forwards: at.forwards, name: at.name, status: at.status,
          records: { pointer: v.name.records, records: state.records }, primary,
          renewal: root ? { schedule, annual_lux: schedule.annual_lux[tier], referral: v.name.referrer !== null, max_years: max } : null,
          consulted: evidence(Boolean(v.name.records)),
        },
      }
    }
    if (method === 'reverse') return { Ok: { height, endpoint: args.endpoint, primary: null, consulted: evidence(false) } }
    const policyEvidence = { policy: bytes(2), policy_version: directory.registration.policy_version, binding, config: policy }
    if (method === 'availability') {
      const node = sdk.nameKey(`${args.label as string}.dusk`).node
      if (sdk.hex(node) === sdk.hex(view.name.key.node))
        return { Ok: { height, node, context: directory.registration, status: { Registered: { store: bytes(3), name: state.view } }, consulted: evidence(false), policy: null } }
      const priced = quote(bytes(7), { node, label: args.label as string, actor: args.actor as number[], years: args.years as number })
      const placement = { store: bytes(7), canonical_store: null, released_root: null }
      return { Ok: { height, node, context: directory.registration, status: { Registrable: { placement, request: priced.request, quote: priced.quote } }, consulted: evidence(false), policy: policyEvidence } }
    }
    if (method === 'bootstrap')
      return { Ok: { height, config: directory, allocation: { version: 1n, newest_store: bytes(7), newest_resolver: bytes(5) }, stores: admissions, resolvers, market: { market, order_api_version: 1 } } }
    if (method === 'pricing') return { Ok: { height, context: directory.registration, policy: policyEvidence } }
    throw new Error(`Unexpected lens read ${method}`)
  }
  const tip = async () => {
    const call: NodeCall = { kind: 'height' }
    calls.push(call)
    await before(call)
    return state.height
  }
  const transport: sdk.ReadTransport = {
    currentBlockHeight: tip,
    ...(blockHashes ? { currentBlock: async () => { const height = await tip(); return { height, hash: height.toString(16).padStart(64, '0') } } } : {}),
    async read(target, method, input) {
      const kind = role.get(target)
      const args = kind ? drivers.get(kind)!.decodeInput(method, input) : decode(input)
      const call: NodeCall = { kind: 'read', target, method, args }
      calls.push(call)
      await before(call)
      if (failNext.delete(`${target}:${method}`)) throw new Error(`Contract read failed (${target}.${method}): refused`)
      if (target === LENS && lens) return encode(lensAnswer(method, args as Record<string, unknown>))
      if (!kind) throw new Error(`Unexpected read ${target}.${method}`)
      if (method === 'interface_version')
        return encode({
          kind: kind[0].toUpperCase() + kind.slice(1),
          version: 1,
          move_version: kind === 'store' ? 1 : 0,
          custody_version: kind === 'store' || kind === 'marketplace' ? 1 : 0,
        })
      if (method === 'binding') return encode(binding)
      if (method === 'order_api_version') return encode(1)
      if (method === 'config') return encode(kind === 'policy' ? policy : directory)
      if (method === 'registration_context') return encode(directory.registration)
      if (method === 'renewal_schedule') return encode(directory.renewal)
      if (method === 'members')
        return encode({ rows: (args as { kind: string }).kind === 'Store' ? admissions : resolvers, next: null })
      if (method === 'member') {
        const { kind: member, id: wanted } = args as { kind: string; id: number[] }
        return encode((member === 'Store' ? admissions : resolvers).find((row) => sdk.hex(row.id) === sdk.hex(wanted)) ?? null)
      }
      if (method === 'market') return encode(sdk.hex((args as { id: number[] }).id) === id(6) ? market : null)
      if (method === 'allocation') return encode({ version: 1n, newest_store: bytes(7), newest_resolver: bytes(5) })
      if (method === 'home') return encode(state.homes.get(target) ?? 'Absent')
      if (method === 'get_name') return encode(state.names.get(target)?.() ?? 'Absent')
      if (method === 'read_records') return encode({ Local: { pointer: state.view.name.records, records: state.records } })
      if (method === 'resolve_record') {
        const { record_key } = args as { record_key: string }
        return encode(state.homes.get(target) === 'Local' ? { Local: state.view.active ? state.records.find((r) => r.key === record_key) ?? null : null } : 'Absent')
      }
      if (method === 'resolve_primary' || method === 'read_primary') return encode(null)
      // As the v1 store, by the directory's schedule; a term past the ten-year horizon is refused.
      if (method === 'quote_renewal')
        return encode({ Local: sdk.estimateRenewalQuote(directory.renewal, state.view.name, (args as { years: number }).years, state.height) })
      if (method === 'quote_registration') return encode(quote(sdk.fromHex(target, 32), args as never).quote)
      if (method === 'capacity') return encode({ memory_bytes: 0n, reserved_bytes: 0n, accepts_new: true, sealed: false })
      throw new Error(`Unexpected read ${target}.${method}`)
    },
  }
  const release = (): sdk.LoadedRelease => {
    const entries = roles.map(([r, n]) => ({
      role: r, contractId: id(n), codeHash: codeHash(n), initHash: initHash(n), dataDriver: { path: `/${r}.wasm`, sha256: '00'.repeat(32) },
    }))
    const lensEntry = { role: 'lens' as const, contractId: LENS, codeHash: codeHash(8), initHash: initCommitment(lensDriver, 'InitLens', { directory: bytes(1) }), dataDriver: { path: '/lens.wasm', sha256: '00'.repeat(32) } }
    return {
      manifest: { chainId: `dusk:${network}`, network, nodeUrl: 'http://node.invalid', indexerUrl: 'http://indexer.invalid', contracts: entries, ...(lens ? { lens: lensEntry } : {}) },
      contracts: new Map(entries.map((c) => [c.contractId, c])),
      drivers: new Map(entries.map((c) => [c.contractId, {
        ...drivers.get(c.role)!,
        decodeOutput: (_: string, reply: Uint8Array) => decode(reply),
      }])),
      artifactBaseUrl: 'http://release.invalid/',
      ...(lens ? { lens: { contract: lensEntry, driver: lensDriver } } : {}),
    }
  }
  const forward = (destination: number, ordinal: number): sdk.Home => ({
    Forwarded: { root: view.name.key.root, destination: bytes(destination), destination_ordinal: ordinal, move_id: bytes(9), generation: 7n, completed_at: 50n },
  })
  return {
    state,
    directory,
    calls,
    failNext,
    lensRefuses,
    transport,
    forward,
    release,
    /** A client of its own release over `transport` (the node itself by default). */
    client: (over: sdk.ReadTransport = transport, options: sdk.ClientOptions = {}) => new sdk.FrozenClient(release(), { ...options, transport: over }),
    onCall: (hook: typeof before) => { before = hook },
    /** How often the node was asked for `method`: a contract method, or `height` for the tip. */
    count: (method: string) => calls.filter((c) => (c.kind === 'height' ? 'height' : c.method) === method).length,
    reads: () => calls.filter((c): c is Extract<NodeCall, { kind: 'read' }> => c.kind === 'read').map((c) => c.method),
  }
}
