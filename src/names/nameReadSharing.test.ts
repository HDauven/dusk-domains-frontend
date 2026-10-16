import { expect, it, vi } from 'vitest'
import * as sdk from '@duskdomains/sdk'
import { bytes, frozenNode, id } from '../test/frozenNode'
import { createDuskDomainsOnChainClient } from './reads'

const onChain = (client: () => sdk.FrozenClient) =>
  createDuskDomainsOnChainClient({ read: { get client() { return Promise.resolve(client()) }, read: vi.fn() } })
const owner = (n: number) => '0x' + n.toString(16).padStart(2, '0').repeat(32)
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}
// A block lands that hands example.dusk to owner 8.
function landBlock(n: ReturnType<typeof frozenNode>) {
  n.state.height += 1n
  n.state.view = { ...n.state.view, name: { ...n.state.view.name, owner: bytes(8) } }
}

it('reads a name once when a page asks for its state and its records together', async () => {
  const n = frozenNode(), client = n.client(), getName = vi.spyOn(client, 'getName')
  const reads = onChain(() => client)
  const [name, records] = await Promise.all([reads.getName('example.dusk'), reads.getRecords('example.dusk')])
  expect(name).toMatchObject({ ok: true, value: { canonicalName: 'example.dusk', store: id(3), record: { owner: owner(9) } } })
  expect(records).toMatchObject({ ok: true, value: [{ key: 'website', value: 'https://example.test' }] })
  expect(getName).toHaveBeenCalledTimes(1)
})

it('reuses a name read for a later read at the same tip, and reads the name again once the tip moved', async () => {
  const n = frozenNode(), client = n.client(), getName = vi.spyOn(client, 'getName')
  const reads = onChain(() => client)
  await reads.getName('example.dusk')
  expect(await reads.getRenewalQuote('example.dusk', 1)).toMatchObject({
    ok: true, value: { quote: { total_lux: '17000000000' }, ref: { incarnation: { generation: 7n, serial: 1n } } },
  })
  expect(getName).toHaveBeenCalledTimes(1)
  landBlock(n)
  expect(await reads.getName('example.dusk')).toMatchObject({ ok: true, value: { record: { owner: owner(8) } } })
  expect(getName).toHaveBeenCalledTimes(2)
})

it('never gives a caller a name read older than the tip it reads after asking', async () => {
  const n = frozenNode(), client = n.client(), getName = vi.spyOn(client, 'getName')
  const reads = onChain(() => client)
  const nameReply = deferred(), tipReply = deferred()
  let heldName = false, heights = 0
  n.onCall(async (call) => {
    if (call.kind === 'read' && call.method === 'get_name' && !heldName) {
      heldName = true
      await nameReply.promise
    }
    // The second caller's tip read: the first read's own height reads are the first and third.
    if (call.kind === 'height' && ++heights === 2) await tipReply.promise
  })
  const first = reads.getName('example.dusk')
  await vi.waitFor(() => expect(n.count('get_name')).toBe(1))
  const second = reads.getName('example.dusk')
  await vi.waitFor(() => expect(n.count('height')).toBe(2))
  nameReply.resolve()
  expect(await first).toMatchObject({ ok: true, value: { record: { owner: owner(9) } } })
  // The first read finished at 100; the second caller's tip read is answered after a block landed.
  landBlock(n)
  tipReply.resolve()
  expect(await second).toMatchObject({ ok: true, value: { record: { owner: owner(8) } } })
  expect(getName).toHaveBeenCalledTimes(2)
})

it('reads a name again for a caller whose shared read failed, and keeps the failure for its own caller', async () => {
  const n = frozenNode(), client = n.client()
  const reads = onChain(() => client)
  n.failNext.add(`${id(3)}:get_name`)
  const [failed, fresh] = await Promise.all([reads.getName('example.dusk'), reads.getName('example.dusk')])
  expect(failed).toMatchObject({ ok: false, error: { message: `Contract read failed (${id(3)}.get_name): refused` } })
  expect(fresh).toMatchObject({ ok: true, value: { store: id(3), record: { owner: owner(9) } } })
})

it('gives each caller its own copy of a shared name read', async () => {
  const n = frozenNode(), client = n.client()
  const reads = onChain(() => client)
  const [a, b] = await Promise.all([reads.getRenewalQuote('example.dusk', 1), reads.getRenewalQuote('example.dusk', 1)])
  if (!a.ok || !b.ok) throw new Error('Expected two renewal quotes')
  a.value.ref.key.root[0] = 99
  a.value.ref.incarnation.serial = 99n
  expect(b.value.ref).toEqual({ key: sdk.nameKey('example.dusk'), incarnation: { generation: 7n, serial: 1n } })
})

it('never reuses a name read by a client the app has since replaced', async () => {
  const n = frozenNode()
  let current = n.client()
  const reads = onChain(() => current)
  await reads.getName('example.dusk')
  current = n.client()
  const getName = vi.spyOn(current, 'getName')
  await reads.getName('example.dusk')
  expect(getName).toHaveBeenCalledTimes(1)
})

it('reads each name for itself', async () => {
  const n = frozenNode(), client = n.client(), getName = vi.spyOn(client, 'getName')
  const reads = onChain(() => client)
  await Promise.all([reads.getName('example.dusk'), reads.getName('other.dusk')])
  expect(getName.mock.calls.map(([spelling]) => spelling)).toEqual(['example.dusk', 'other.dusk'])
})

it('says the same for a name that isn’t registered', async () => {
  const n = frozenNode()
  n.state.homes.set(id(3), 'Absent')
  n.state.names.set(id(3), () => 'Absent')
  const client = n.client(), reads = onChain(() => client)
  const [name, records, renewal] = await Promise.all([
    reads.getName('example.dusk'), reads.getRecords('example.dusk'), reads.getRenewalQuote('example.dusk', 1),
  ])
  expect(name).toMatchObject({ ok: true, value: { store: id(7), record: null, ref: null } })
  expect(records).toMatchObject({ ok: false, error: { message: 'This name is no longer registered. Refresh and try again.' } })
  expect(renewal).toMatchObject({ ok: false, error: { message: 'This name is no longer registered. Refresh and try again.' } })
})
