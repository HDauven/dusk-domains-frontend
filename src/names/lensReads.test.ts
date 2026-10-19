import { expect, it, vi } from 'vitest'
import * as sdk from '@duskdomains/sdk'
import { createDuskDomainsConnectApp } from '@duskdomains/sdk/connect-app'
import { bytes, frozenNode, id, LENS } from '../test/frozenNode'
import { account } from '../test/frozenFixtures'
import { readPoolMarketplace } from '../app/poolMarketplace'
import * as intent from './commands'
import { namehashHex } from './hash'
import { prepareFrozenCall } from './prepareFrozenCall'
import { createDuskDomainsOnChainClient } from './reads'

type Node = ReturnType<typeof frozenNode>
const onChain = (client: sdk.FrozenClient) => createDuskDomainsOnChainClient({ read: { client: Promise.resolve(client), read: vi.fn() } })
const reads = (n: Node, targets: string[]) =>
  n.calls.flatMap((call) => (call.kind === 'read' && targets.includes(call.target) ? [call.method] : []))
const lensReads = (n: Node) => reads(n, [LENS])
const storeReads = (n: Node) => reads(n, [id(3), id(7)])
const argsOf = (n: Node, method: string) => n.calls.find((call) => call.kind === 'read' && call.method === method) as { args: unknown }
// A client as the live app creates one: its directory verified, nothing else.
async function lensClient(options: sdk.ClientOptions = {}) {
  const n = frozenNode({ lens: true, blockHashes: true })
  const client = n.client(n.transport, options)
  await client.verifyContract('directory', id(1))
  n.calls.length = 0
  return { n, client }
}

it('reads a name page in one lens query, at the store the indexer names', async () => {
  const { n, client } = await lensClient()
  expect(await onChain(client).getNamePage('example.dusk', id(3))).toMatchObject({ ok: true, value: {
    name: { canonicalName: 'example.dusk', store: id(3), record: { owner: '0x' + id(9) } },
    records: [{ key: 'website', value: 'https://example.test' }], primaryName: null, primaryError: null,
  } })
  // The lens deployment is checked once, then the page is one query; no store is read.
  expect(lensReads(n)).toEqual(['binding', 'lens_interface', 'name_page'])
  expect(storeReads(n)).toEqual([])
  expect(argsOf(n, 'name_page').args).toEqual({ name: 'example.dusk', hint: sdk.fromHex(id(3), 32) })
})

it.each(['turned off', 'refusing'] as const)('reads the same name page directly with the lens %s', async (mode) => {
  const fallbacks: sdk.LensFallback[] = []
  const { n, client } = await lensClient({ useLens: mode !== 'turned off', onLensFallback: (fallback) => void fallbacks.push(fallback) })
  if (mode === 'refusing') n.lensRefuses.add('name_page')
  expect(await onChain(client).getNamePage('example.dusk', id(3))).toMatchObject({ ok: true, value: {
    name: { store: id(3), record: { owner: '0x' + id(9) } }, records: [{ key: 'website', value: 'https://example.test' }],
  } })
  expect(lensReads(n)).toEqual(mode === 'turned off' ? [] : ['binding', 'lens_interface', 'name_page'])
  expect(storeReads(n)).toEqual(expect.arrayContaining(['home', 'get_name', 'read_records']))
  expect(fallbacks.map((fallback) => [fallback.method, fallback.reason])).toEqual(mode === 'turned off' ? [] : [['namePage', 'refused']])
})

it('gives the page’s other parts the name the page read, at its height, and prices its renewal without a read', async () => {
  const { n, client } = await lensClient()
  const chain = onChain(client)
  await chain.getNamePage('example.dusk', id(3))
  const getName = vi.spyOn(client, 'getName'), read = n.calls.length
  // 17 DUSK a year, for any term up to the 9 years the page's horizon allows.
  expect(await chain.getRenewalQuote('example.dusk', 1)).toMatchObject({ ok: true, value: {
    store: id(3), quote: { total_lux: '17000000000', schedule_version: 1n }, ref: { incarnation: { generation: 7n, serial: 1n } },
  } })
  expect(await chain.getRenewalQuote('example.dusk', 9)).toMatchObject({ ok: true, value: { quote: { total_lux: '153000000000' } } })
  expect(n.calls.slice(read)).toEqual([])
  // A term past it isn't quoted: the store would refuse it.
  expect(await chain.getRenewalQuote('example.dusk', 10)).toMatchObject({ ok: false, error: {
    message: 'A name can run at most 10 years ahead, so this term isn’t available now.',
  } })
  expect(n.calls.slice(read)).toEqual([])
  expect(await chain.getName('example.dusk')).toMatchObject({ ok: true, value: { store: id(3) } })
  // Neither asked the lens for the name again.
  expect(getName).not.toHaveBeenCalled()
  expect(lensReads(n)).toEqual(['binding', 'lens_interface', 'name_page'])
})

// The price a page shows is for display. A renewal is signed only from the store's own quote, read
// again before the wallet is asked, and a price that changed since is refused, never signed.
it('renews at the price a page showed only once the store quotes it again', async () => {
  const { n, client } = await lensClient()
  const chain = onChain(client)
  await chain.getNamePage('example.dusk', id(3))
  const shown = await chain.getRenewalQuote('example.dusk', 2)
  if (!shown.ok) throw new Error(shown.error.message)
  const { quote, ref } = shown.value, read = n.calls.length
  const renew = () => prepareFrozenCall(client, {
    ...intent.storeRenewRequest({ node: namehashHex('example.dusk'), durationYears: 2, feeLux: Number(quote.total_lux) }),
    nameRef: ref, expectedScheduleVersion: quote.schedule_version, reviewedRenewal: { owner: '0x' + id(9), listing: null },
  }, 'example.dusk', account)
  expect(await renew()).toMatchObject({ contractId: id(3), functionName: 'renew', deposit: '34000000000',
    args: { years: 2, expected_fee_lux: '34000000000', expected_schedule_version: 1n } })
  expect(n.calls.slice(read)).toContainEqual(expect.objectContaining({ target: id(3), method: 'quote_renewal' }))
  // A block lands that replaces the renewal schedule.
  n.state.height += 1n
  n.directory.renewal = { ...n.directory.renewal, version: 2n }
  await expect(renew()).rejects.toThrow('On-chain terms changed')
})

it('quotes a renewal directly where the page can’t price it, and says when that read fails', async () => {
  const { n, client } = await lensClient()
  // A pending move may finalize before the quote, so the page can't price the renewal.
  n.state.view = { ...n.state.view, move_pending: bytes(9) }
  const chain = onChain(client)
  await chain.getNamePage('example.dusk', id(3))
  n.failNext.add(`${id(3)}:quote_renewal`)
  expect(await chain.getRenewalQuote('example.dusk', 1)).toEqual({ ok: false, error: {
    code: 'contract_read_failed', message: `Contract read failed (${id(3)}.quote_renewal): refused`,
  } })
  expect(await chain.getRenewalQuote('example.dusk', 1)).toMatchObject({ ok: true, value: { quote: { total_lux: '17000000000' } } })
  expect(storeReads(n).filter((method) => method === 'quote_renewal')).toHaveLength(2)
})

it('verifies a primary name in one lens query, at the store the indexer names', async () => {
  const { n, client } = await lensClient()
  expect(await onChain(client).getPrimaryName({ type: 'moonlight_address', value: account }, id(7))).toEqual({ ok: true, value: null })
  expect(lensReads(n)).toEqual(['binding', 'lens_interface', 'reverse'])
  expect(argsOf(n, 'reverse').args).toMatchObject({ hint: sdk.fromHex(id(7), 32) })
})

it('previews a registration price for display through the lens, after the pause check', async () => {
  const { n, client } = await lensClient()
  expect(await onChain(client).getRegistrationQuote('fresh.dusk', 1, '0x' + '01'.repeat(32))).toMatchObject({
    ok: true, value: { store: id(7), quote: { total_lux: '10000000000', policy: sdk.fromHex(id(2), 32) } },
  })
  expect(lensReads(n)).toEqual(['binding', 'lens_interface', 'availability'])
  // While registrations are paused no quote is read at all, so the directory says first.
  expect(n.reads().filter((method) => method !== 'binding' && method !== 'lens_interface')).toEqual(['registration_context', 'availability'])
})

it('reads the preferred market from the directory’s state in one lens query', async () => {
  const { n, client } = await lensClient()
  expect(await readPoolMarketplace(client)).toEqual({ preferred: '0x' + id(6), recorded: true })
  expect(lensReads(n)).toEqual(['binding', 'lens_interface', 'bootstrap'])
})

// A lens read verifies nothing for signing: Connect signs only for contracts its client verified.
it('verifies the store a lens read showed before a write to it is signed', async () => {
  const { n, client } = await lensClient()
  const wallet = { request: vi.fn(async (method: string) => (method === 'dusk_chainId' ? 'dusk:0' : { median: '1' })) }
  const request = intent.storeMutateRecordsSenderRequest({ node: namehashHex('example.dusk'), mutations: [{ action: 'clear', key: 'website' }] })
  // Reading the name through the lens left its store unverified.
  const shown = await client.getName('example.dusk')
  expect(lensReads(n)).toEqual(['binding', 'lens_interface', 'resolve'])
  const unverified = sdk.storeMutateRecordsCall(shown.store, { name: { key: sdk.nameKey('example.dusk'), incarnation: { generation: 7n, serial: 1n } }, mutations: [{ action: 'Set', ...sdk.createRecordInput('website', 'https://example.test') }] })
  await expect(createDuskDomainsConnectApp(wallet, client.release).prepare(unverified)).rejects.toBeInstanceOf(sdk.UnverifiedContractError)
  // The prepared call's store is verified with the client, so Connect prepares it.
  const call = await prepareFrozenCall(client, request, 'example.dusk', account)
  expect(call).toMatchObject({ contractId: id(3), functionName: 'mutate_records' })
  expect(n.reads()).toEqual(expect.arrayContaining(['member', 'interface_version', 'binding']))
  expect(await createDuskDomainsConnectApp(wallet, client.release).prepare(call as sdk.FrozenCall)).toMatchObject({ contractId: id(3), fnName: 'mutate_records' })
})
