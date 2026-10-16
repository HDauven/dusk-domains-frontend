// Tests for the SDK 0.3.2 bridge in sharedReads.ts. Delete them with it.
import { describe, expect, it } from 'vitest'
import * as sdk from '@duskdomains/sdk'
import { bytes, frozenNode, id } from '../test/frozenNode'
import { clearSessionImmutableReads, createSharedReadTransport, sessionImmutableReads } from './sharedReads'

const text = (reply: Uint8Array) => new TextDecoder().decode(reply)
const input = (n: number) => Uint8Array.of(n)
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

// A node whose replies say which read they answer, in which order (#n) and at which tip (@h).
function scriptedNode() {
  const log: string[] = []
  const held: Array<() => void> = []
  const holding = { height: false, read: false }
  const failing = new Set<string>()
  let tip = 10n,
    answered = 0
  const wait = (kind: 'height' | 'read') =>
    holding[kind] ? new Promise<void>((resolve) => held.push(resolve)) : undefined
  return {
    log,
    heights: () => log.filter((entry) => entry === 'height').length,
    reads: (method?: string) => log.filter((entry) => entry !== 'height' && (!method || entry.endsWith('.' + method))).length,
    setTip: (height: bigint) => { tip = height },
    hold: (kind: 'height' | 'read') => { holding[kind] = true },
    /** Lets the `index`-th held call answer, or every held call. Later calls are no longer held. */
    release: (index?: number) => {
      holding.height = holding.read = false
      if (index === undefined) held.splice(0).forEach((resolve) => resolve())
      else held[index]!()
    },
    fail: (what: string) => failing.add(what),
    transport: {
      async currentBlockHeight() {
        log.push('height')
        await wait('height')
        if (failing.delete('height')) throw new Error('Block height read failed: HTTP 503')
        return tip
      },
      async read(contract: string, method: string, bytes: Uint8Array) {
        log.push(`${contract}.${method}`)
        await wait('read')
        if (failing.delete(`${contract}.${method}`)) throw new Error(`Contract read failed (${contract}.${method}): refused`)
        return new TextEncoder().encode(`${contract}.${method}(${sdk.hex(bytes)}) #${++answered} @${tip}`)
      },
    } satisfies sdk.ReadTransport,
  }
}

function memoryStorage(entries: Record<string, string> = {}) {
  const memory = new Map(Object.entries(entries))
  return {
    memory,
    get length() { return memory.size },
    key: (index: number) => [...memory.keys()][index] ?? null,
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { memory.set(key, value) },
    removeItem: (key: string) => { memory.delete(key) },
  }
}

describe('createSharedReadTransport', () => {
  it('answers a read repeated at one height from the first reply, giving each caller its own copy', async () => {
    const node = scriptedNode(), shared = createSharedReadTransport(node.transport)
    expect(await shared.currentBlockHeight()).toBe(10n)
    const first = await shared.read('aa', 'members', input(1))
    first[0] = 0
    const again = await shared.read('aa', 'members', input(1))
    expect(text(again)).toBe('aa.members(01) #1 @10')
    expect(node.reads()).toBe(1)
  })

  it('reads again once the node reports another height', async () => {
    const node = scriptedNode(), shared = createSharedReadTransport(node.transport)
    await shared.currentBlockHeight()
    await shared.read('aa', 'members', input(1))
    node.setTip(11n)
    expect(await shared.currentBlockHeight()).toBe(11n)
    expect(text(await shared.read('aa', 'members', input(1)))).toBe('aa.members(01) #2 @11')
    expect(text(await shared.read('aa', 'members', input(1)))).toBe('aa.members(01) #2 @11')
    expect(node.reads()).toBe(2)
  })

  it('never answers a read with the reply to another contract, method or input', async () => {
    const node = scriptedNode(), shared = createSharedReadTransport(node.transport)
    await shared.currentBlockHeight()
    const replies = await Promise.all([
      shared.read('aa', 'home', input(1)),
      shared.read('aa', 'home', input(2)),
      shared.read('bb', 'home', input(1)),
      shared.read('aa', 'get_name', input(1)),
    ])
    expect(replies.map(text)).toEqual([
      'aa.home(01) #1 @10', 'aa.home(02) #2 @10', 'bb.home(01) #3 @10', 'aa.get_name(01) #4 @10',
    ])
  })

  it('sends identical reads in flight once', async () => {
    const node = scriptedNode(), shared = createSharedReadTransport(node.transport)
    await shared.currentBlockHeight()
    node.hold('read')
    const both = Promise.all([shared.read('aa', 'home', input(1)), shared.read('aa', 'home', input(1))])
    await settle()
    expect(node.reads()).toBe(1)
    node.release()
    expect((await both).map(text)).toEqual(['aa.home(01) #1 @10', 'aa.home(01) #1 @10'])
  })

  it('keeps no failed read: every waiter sees its error, and the next read asks the node again', async () => {
    const node = scriptedNode(), shared = createSharedReadTransport(node.transport)
    await shared.currentBlockHeight()
    node.fail('aa.home')
    const waiters = await Promise.allSettled([shared.read('aa', 'home', input(1)), shared.read('aa', 'home', input(1))])
    expect(waiters).toEqual([
      { status: 'rejected', reason: new Error('Contract read failed (aa.home): refused') },
      { status: 'rejected', reason: new Error('Contract read failed (aa.home): refused') },
    ])
    expect(node.reads()).toBe(1)
    expect(text(await shared.read('aa', 'home', input(1)))).toBe('aa.home(01) #1 @10')
    expect(node.reads()).toBe(2)
  })

  it('neither keeps nor joins a read that was on its way when the height changed', async () => {
    const node = scriptedNode(), shared = createSharedReadTransport(node.transport)
    await shared.currentBlockHeight()
    node.hold('read')
    const before = shared.read('aa', 'home', input(1))
    await settle()
    node.setTip(11n)
    await shared.currentBlockHeight()
    const after = shared.read('aa', 'home', input(1))
    await settle()
    expect(node.reads()).toBe(2)
    // The later read answers first; the earlier one, sent at 10, then lands and must not replace it.
    node.release(1)
    expect(text(await after)).toBe('aa.home(01) #1 @11')
    node.release(0)
    expect(text(await before)).toBe('aa.home(01) #2 @11')
    expect(text(await shared.read('aa', 'home', input(1)))).toBe('aa.home(01) #1 @11')
    expect(node.reads()).toBe(2)
  })

  it('asks the node for every height read; only calls made in one turn share a request, sent after the last of them asked', async () => {
    const node = scriptedNode(), shared = createSharedReadTransport(node.transport)
    const first = shared.currentBlockHeight()
    node.setTip(11n)
    const second = shared.currentBlockHeight()
    expect(await Promise.all([first, second])).toEqual([11n, 11n])
    expect(node.heights()).toBe(1)
    expect(await shared.currentBlockHeight()).toBe(11n)
    expect(await shared.currentBlockHeight()).toBe(11n)
    expect(node.heights()).toBe(3)
    // A call made while a request is already on its way gets a request of its own.
    node.hold('height')
    const sent = shared.currentBlockHeight()
    await settle()
    node.setTip(12n)
    const later = shared.currentBlockHeight()
    await settle()
    expect(node.heights()).toBe(5)
    node.release()
    expect(await Promise.all([sent, later])).toEqual([12n, 12n])
  })

  it('gives a failed height read to every caller sharing it and keeps nothing', async () => {
    const node = scriptedNode(), shared = createSharedReadTransport(node.transport)
    node.fail('height')
    const callers = await Promise.allSettled([shared.currentBlockHeight(), shared.currentBlockHeight()])
    expect(callers).toEqual([
      { status: 'rejected', reason: new Error('Block height read failed: HTTP 503') },
      { status: 'rejected', reason: new Error('Block height read failed: HTTP 503') },
    ])
    expect(await shared.currentBlockHeight()).toBe(10n)
    expect(node.heights()).toBe(2)
  })

  it('shares no read before the first height reply', async () => {
    const node = scriptedNode(), shared = createSharedReadTransport(node.transport)
    await shared.read('aa', 'home', input(1))
    node.hold('read')
    const both = Promise.all([shared.read('aa', 'home', input(1)), shared.read('aa', 'home', input(1))])
    await settle()
    node.release()
    await both
    expect(node.reads()).toBe(3)
  })

  it('shares no read once no height was read for five seconds', async () => {
    let now = 0
    const node = scriptedNode(), shared = createSharedReadTransport(node.transport, { now: () => now })
    await shared.currentBlockHeight()
    await shared.read('aa', 'home', input(1))
    now = 5000
    await shared.read('aa', 'home', input(1))
    expect(node.reads()).toBe(1)
    now = 5001
    expect(text(await shared.read('aa', 'home', input(1)))).toBe('aa.home(01) #2 @10')
    expect(text(await shared.read('aa', 'home', input(1)))).toBe('aa.home(01) #3 @10')
    // A height read confirming the tip makes the generation's replies current again.
    await shared.currentBlockHeight()
    expect(text(await shared.read('aa', 'home', input(1)))).toBe('aa.home(01) #1 @10')
    expect(node.reads()).toBe(3)
  })

  it('keeps a contract’s interface, binding and order API version at every height, but none of their failures', async () => {
    const node = scriptedNode(), shared = createSharedReadTransport(node.transport)
    const before = await Promise.all(['interface_version', 'binding', 'order_api_version'].map((method) => shared.read('aa', method, input(0))))
    node.setTip(11n)
    await shared.currentBlockHeight()
    const after = await Promise.all(['interface_version', 'binding', 'order_api_version'].map((method) => shared.read('aa', method, input(0))))
    expect(after.map(text)).toEqual(before.map(text))
    expect(node.reads()).toBe(3)
    node.fail('bb.binding')
    await expect(shared.read('bb', 'binding', input(0))).rejects.toThrow('Contract read failed (bb.binding): refused')
    expect(text(await shared.read('bb', 'binding', input(0)))).toBe('bb.binding(00) #4 @11')
    expect(node.reads()).toBe(5)
  })
})

describe('sessionImmutableReads', () => {
  const release = { chainId: 'dusk:2', contracts: [{ role: 'store', contractId: id(3) }] }

  it('keeps only the immutable replies, for one release, across page loads', async () => {
    const storage = memoryStorage()
    const node = scriptedNode()
    const first = createSharedReadTransport(node.transport, { immutable: sessionImmutableReads(release, () => storage) })
    await first.currentBlockHeight()
    await first.read('aa', 'binding', input(0))
    await first.read('aa', 'members', input(0))
    expect(storage.memory.size).toBe(1)
    // The next page load in this tab reads its binding from the session; members from the node.
    const reload = createSharedReadTransport(node.transport, { immutable: sessionImmutableReads(release, () => storage) })
    await reload.currentBlockHeight()
    expect(text(await reload.read('aa', 'binding', input(0)))).toBe('aa.binding(00) #1 @10')
    expect(text(await reload.read('aa', 'members', input(0)))).toBe('aa.members(00) #3 @10')
    // Another release, as after the operator republishes the manifest, reads its own.
    const republished = createSharedReadTransport(node.transport, {
      immutable: sessionImmutableReads({ ...release, contracts: [...release.contracts, { role: 'policy', contractId: id(9) }] }, () => storage),
    })
    expect(text(await republished.read('aa', 'binding', input(0)))).toBe('aa.binding(00) #4 @10')
    expect(node.reads('binding')).toBe(2)
  })

  it('names any release a manifest can hold, and keeps nothing for one it can’t name', async () => {
    // The SDK's manifest validator keeps every field of the deploy tool's manifest, decimals too.
    const storage = memoryStorage()
    const node = scriptedNode()
    const odd = { ...release, gasPriceDusk: 0.000000001, note: undefined, total: 12345678901234567890n }
    const shared = createSharedReadTransport(node.transport, { immutable: sessionImmutableReads(odd, () => storage) })
    expect(text(await shared.read('aa', 'binding', input(0)))).toBe('aa.binding(00) #1 @10')
    expect(storage.memory.size).toBe(1)
    const cyclic: Record<string, unknown> = { ...release }
    cyclic.self = cyclic
    const unnamed = sessionImmutableReads(cyclic, () => storage)
    unnamed.set('aa/binding/00', Uint8Array.of(1))
    expect(unnamed.get('aa/binding/00')).toBeUndefined()
    expect(storage.memory.size).toBe(1)
  })

  it('reads from the node when session storage is missing or throws', async () => {
    const broken = {
      get length() { throw new Error('SecurityError') },
      key: () => { throw new Error('SecurityError') },
      getItem: () => { throw new Error('SecurityError') },
      setItem: () => { throw new Error('QuotaExceededError') },
      removeItem: () => { throw new Error('SecurityError') },
    }
    for (const storage of [() => undefined, () => { throw new Error('SecurityError') }, () => broken]) {
      const node = scriptedNode()
      const shared = createSharedReadTransport(node.transport, { immutable: sessionImmutableReads(release, storage) })
      expect(text(await shared.read('aa', 'binding', input(0)))).toBe('aa.binding(00) #1 @10')
      expect(text(await shared.read('aa', 'binding', input(0)))).toBe('aa.binding(00) #1 @10')
      expect(node.reads()).toBe(1)
      expect(() => clearSessionImmutableReads(storage)).not.toThrow()
    }
  })

  it('reads a damaged stored reply from the node again', async () => {
    const storage = memoryStorage()
    const node = scriptedNode()
    await createSharedReadTransport(node.transport, { immutable: sessionImmutableReads(release, () => storage) }).read('aa', 'binding', input(0))
    const [key] = storage.memory.keys()
    for (const damaged of ['zz', '0', '']) {
      storage.memory.set(key!, damaged)
      const shared = createSharedReadTransport(node.transport, { immutable: sessionImmutableReads(release, () => storage) })
      expect(text(await shared.read('aa', 'binding', input(0)))).toMatch(/^aa\.binding\(00\) #\d+ @10$/)
    }
    expect(node.reads()).toBe(4)
  })

  it('clears its own entries and nothing else', async () => {
    const storage = memoryStorage({ 'dusk-domains:pending-reservations': '[]', 'dusk-domains:last-claim-owner:dusk:2': 'x' })
    await createSharedReadTransport(scriptedNode().transport, { immutable: sessionImmutableReads(release, () => storage) }).read('aa', 'binding', input(0))
    expect(storage.memory.size).toBe(3)
    clearSessionImmutableReads(() => storage)
    expect([...storage.memory.keys()]).toEqual(['dusk-domains:pending-reservations', 'dusk-domains:last-claim-owner:dusk:2'])
  })
})

const local = (value: sdk.Located<sdk.NameView>) => {
  if (typeof value !== 'object' || !('Local' in value)) throw new Error('Expected a local name')
  return value.Local
}
const through = [
  ['the node itself', (node: sdk.ReadTransport) => node],
  ['the sharing transport', (node: sdk.ReadTransport) => createSharedReadTransport(node)],
] as const

// What SDK 0.3.2 reads, refuses and retries must not depend on the transport sharing reads.
describe.each(through)('SDK 0.3.2 reading through %s', (_, over) => {
  it('finds a name moved to a later store at its new home', async () => {
    const n = frozenNode()
    n.state.homes.set(id(3), n.forward(7, 1))
    n.state.homes.set(id(7), 'Local')
    n.state.names.set(id(7), () => ({ Local: n.state.view }))
    const routed = await n.client(over(n.transport)).getName('example.dusk')
    expect(routed).toMatchObject({ store: id(7), height: 100n, forwards: [{ destination: bytes(7), destination_ordinal: 1 }] })
    expect(local(routed.value).name.owner).toEqual(bytes(9))
  })

  it('refuses a forward to a store the directory hasn’t admitted', async () => {
    const n = frozenNode()
    n.state.homes.set(id(3), n.forward(8, 1))
    await expect(n.client(over(n.transport)).getName('example.dusk')).rejects.toThrow('Unadmitted store')
  })

  it('refuses a forward back to an earlier store', async () => {
    const n = frozenNode()
    n.state.homes.set(id(3), 'Absent')
    n.state.homes.set(id(7), n.forward(3, 0))
    await expect(n.client(over(n.transport)).getName('example.dusk')).rejects.toThrow('Non-monotone or invalid shard forwarding')
  })

  it('refuses a forward chain longer than the hop limit', async () => {
    const n = frozenNode()
    n.state.homes.set(id(3), n.forward(7, 1))
    n.state.homes.set(id(7), n.forward(3, 0))
    await expect(n.client(over(n.transport), { hopLimit: 1 }).getName('example.dusk')).rejects.toThrow('Forwarding hop limit exceeded')
  })

  it('reads the name again at the new height when the tip moves mid-read', async () => {
    const n = frozenNode()
    let moved = false
    n.onCall((call) => {
      if (moved || call.kind !== 'read' || call.method !== 'get_name') return
      moved = true
      n.state.height = 101n
      n.state.view = { ...n.state.view, name: { ...n.state.view.name, owner: bytes(8) } }
    })
    const routed = await n.client(over(n.transport)).getName('example.dusk')
    expect(routed.height).toBe(101n)
    expect(local(routed.value).name.owner).toEqual(bytes(8))
    expect(n.count('get_name')).toBe(2)
  })

  it('fails after the tip moved during three tries, reading the height before and after each', async () => {
    const n = frozenNode()
    n.onCall((call) => {
      if (call.kind === 'read' && call.method === 'get_name') n.state.height += 1n
    })
    await expect(n.client(over(n.transport)).getName('example.dusk')).rejects.toThrow('Chain tip changed during read; retry the snapshot')
    expect(n.count('height')).toBe(6)
    expect(n.count('get_name')).toBe(3)
  })

  it('fails a refused read, and asks the node again next time', async () => {
    const n = frozenNode(), client = n.client(over(n.transport))
    n.failNext.add(`${id(3)}:get_name`)
    await expect(client.getName('example.dusk')).rejects.toThrow(`Contract read failed (${id(3)}.get_name): refused`)
    await expect(client.getName('example.dusk')).resolves.toMatchObject({ store: id(3), height: 100n })
    expect(n.count('get_name')).toBe(2)
  })

  it('discovers the same deployment', async () => {
    const n = frozenNode()
    const state = await n.client(over(n.transport)).discover()
    expect(state).toMatchObject({ height: 100n, config: { store_count: 2, resolver_count: 1 } })
    expect(state.stores.map((a) => sdk.contractId(a.id))).toEqual([id(3), id(7)])
  })
})

it('asks the node once per height for the reads SDK 0.3.2 repeats in getName', async () => {
  const counts = (n: ReturnType<typeof frozenNode>) => ({ members: n.count('members'), home: n.count('home'), get_name: n.count('get_name') })
  const plain = frozenNode(), plainClient = plain.client()
  await plainClient.getName('example.dusk')
  await plainClient.getName('example.dusk')
  expect(counts(plain)).toEqual({ members: 4, home: 4, get_name: 2 })

  const n = frozenNode(), client = n.client(createSharedReadTransport(n.transport))
  const first = await client.getName('example.dusk')
  expect(await client.getName('example.dusk')).toEqual(first)
  expect(await Promise.all([client.getName('example.dusk'), client.getName('example.dusk')])).toEqual([first, first])
  expect(counts(n)).toEqual({ members: 1, home: 1, get_name: 1 })
  n.state.height = 101n
  expect(await client.getName('example.dusk')).toEqual({ ...first, height: 101n })
  expect(counts(n)).toEqual({ members: 2, home: 2, get_name: 2 })
})
