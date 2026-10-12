import { expect, it, vi } from 'vitest'
import { contractPrincipalFromWalletAccount, encodeBase58, type ActivityEntry, type DuskDomainsIndexerClient } from '../../names/internal'
import { account } from '../../test/frozenFixtures'
import { abbreviate } from '../../utils/format'
import { activityActions, activityPartyLabel } from './activityActions'
import { activityCsv } from './activityCsv'
import { loadSubnameActivity, type SubnameFeed } from './subnameActivity'
import { indexedSubnameToState } from '../../app/indexerReadHelpers'

// Sam's community name and the two subnames he made: sam. (his own) and maya. (he owns it, Maya manages it).
// The indexer files every event under the name in its body, so the parent's own feed only sees each
// subname transaction as its root's counters changing.
const bytes = (fill: number, length = 32) => Array(length).fill(fill) as number[]
const hex = (value: number[]) => `0x${value.map(byte => byte.toString(16).padStart(2, '0')).join('')}`
const root = bytes(7), samNode = bytes(8), mayaNode = bytes(9), goneNode = bytes(10)
const sam = bytes(0x11), maya = bytes(0x22)
const mayaKey = Array.from({ length: 96 }, (_, index) => (index * 11 + 5) % 256)
const ref = (node: number[], serial: string) => ({ key: { root, node }, incarnation: { generation: '1', serial } })
const subname = (node: number[], serial: string, label: string, owner: number[], manager: number[]) => ({ ...ref(node, serial), label, owner, manager,
  expires_at: '3153700', grace_end: '3412900', referrer: null, subname: { parent: root, depth: 1, expiry_policy: 'InheritsParent', created_at: '450' }, records: null, custody: null })
let counter = 0
function row(eventType: string, data: unknown, tx: string, height: number, at = root): ActivityEntry {
  counter += 1
  const timestamp = new Date(Date.parse('2026-10-11T19:00:00Z') + height * 10_000).toISOString()
  return { id: `${tx}:${counter}`, eventType, node: hex(at), contractId: hex(bytes(0x7f)), name: '', actor: '', timestamp, blockHeight: height, txId: tx, data } as ActivityEntry
}
const counters = (tx: string, height: number, serial: string, revision: string) =>
  row('root_counters_changed', { root, counters: { generation: '1', next_serial: serial, next_epoch: '2', next_custody: '1', revision } }, tx, height)
const addressRecord = (height: number) => ({ key: 'moonlight_address', value: mayaKey, ttl_seconds: '300', updated_at: String(height) })
const recordWrite = (node: number[], tx: string, height: number) => [
  row('slot_changed', { name: ref(node, '2'), previous: null, current: { resolver: bytes(0xab), epoch: '2', count: 1, digest: bytes(height % 256) }, reason: 'Mutation' }, tx, height, node),
  row('resolver_slot_written', { slot: { registry: bytes(0x7f), node, epoch: '2' }, snapshot: { records: [addressRecord(height)], count: 1, digest: bytes(height % 256) } }, tx, height, node),
]

// Newest first, as the indexer serves each name's activity.
// The registration took serial 1; sam. took serial 2 and maya. serial 3.
const parent = [
  counters('tx-remove', 490, '4', '8'),
  counters('tx-take', 480, '4', '7'),
  counters('tx-sam-record', 470, '4', '6'),
  counters('tx-maya-record', 465, '4', '5'),
  counters('tx-create-maya', 461, '4', '4'),
  counters('tx-create-sam', 450, '3', '3'),
]
const samFeed: SubnameFeed = { name: 'sam.nightowlshq.dusk', node: hex(samNode), holders: { owner: hex(sam), manager: hex(sam) }, partial: false, entries: [
  // Sam already held sam., so the chain records his take-back as a holder update that clears its data.
  row('identity_cleared', { name: ref(samNode, '2'), old_slot: null, old_primary: null, reason: 'Holder' }, 'tx-take', 480, samNode),
  row('authorities_changed', { name: subname(samNode, '2', 'sam', sam, sam), previous_owner: sam, previous_manager: sam, actor: sam, reason: 'Holder', data_cleared: true }, 'tx-take', 480, samNode),
  ...recordWrite(samNode, 'tx-sam-record', 470),
  row('subname_created', { name: subname(samNode, '2', 'sam', sam, sam), actor: sam }, 'tx-create-sam', 450, samNode),
] }
const mayaFeed: SubnameFeed = { name: 'maya.nightowlshq.dusk', node: hex(mayaNode), holders: { owner: hex(sam), manager: hex(maya) }, partial: false, entries: [
  ...recordWrite(mayaNode, 'tx-maya-record', 465),
  row('subname_created', { name: subname(mayaNode, '3', 'maya', sam, maya), actor: sam }, 'tx-create-maya', 461, mayaNode),
] }

it('names the subname, the action and who did it on the parent, from the subname\'s own events', () => {
  const context = { label: activityPartyLabel(hex(sam)), subnameActivity: { feeds: [samFeed, mayaFeed], complete: true },
    subnames: [{ name: 'sam.nightowlshq.dusk', serial: '2' }, { name: 'maya.nightowlshq.dusk', serial: '3' }] }
  // Until something is removed, today's subnames are all there were.
  expect(activityActions(parent.slice(1), context).map(({ title, details, actor }) => ({ title, details, actor }))).toEqual([
    // Sam already owned and managed it, so taking it back only cleared its data.
    { title: 'sam.nightowlshq.dusk: Records and primary name cleared', details: [], actor: { kind: 'authority', authority: hex(sam) } },
    // One account owns and manages sam., so it made the change.
    { title: 'sam.nightowlshq.dusk: Record updated: Dusk address', details: [], actor: { kind: 'authority', authority: hex(sam) } },
    // Owner and manager differ on maya.: either could have, so nobody is credited.
    { title: 'maya.nightowlshq.dusk: Record updated: Dusk address', details: [], actor: null },
    // Sam stays its owner; Maya manages it.
    { title: `Subname maya.nightowlshq.dusk created, managed by Account ID ${abbreviate(hex(maya))}`, details: [], actor: { kind: 'authority', authority: hex(sam) } },
    { title: 'Subname sam.nightowlshq.dusk created', details: [], actor: { kind: 'authority', authority: hex(sam) } },
  ])
  // Removed subnames leave the namespace, so nothing shows which one went: the honest fallback stays for
  // the removal, and the rows before it say only what the subnames read show.
  expect(activityActions(parent, context).slice(0, 2).map(({ title, details, actor }) => ({ title, details, actor }))).toEqual([
    { title: 'Subname changed', details: [], actor: null },
    { title: 'Subnames changed', details: ['Including sam.nightowlshq.dusk: Records and primary name cleared'], actor: { kind: 'authority', authority: hex(sam) } },
  ])
  // Without the subnames' activity, creations are still known from the root's serials.
  expect(activityActions(parent, { subnames: [{ name: 'sam.nightowlshq.dusk', serial: '2' }, { name: 'maya.nightowlshq.dusk', serial: '3' }] })
    .map(action => action.title)).toEqual(['Subname changed', 'Subname changed', 'Subname changed', 'Subname changed',
    'Subname maya.nightowlshq.dusk created', 'Subname changed'])
})

it('says only what the loaded subnames show when a transaction may have touched more of them', () => {
  // One take-back can cover up to 256 subnames, and the root's counters rise once.
  const take = (node: number[], name: string, serial: string) => ({ name, node: hex(node), holders: { owner: hex(sam), manager: hex(sam) }, partial: false, entries: [
    row('authorities_changed', { name: subname(node, serial, name.split('.')[0], sam, sam), previous_owner: maya, previous_manager: maya, actor: sam, reason: 'TakeBack', data_cleared: true }, 'tx-batch', 500, node),
  ] })
  const batch = [counters('tx-batch', 500, '4', '9')]
  const feeds = [take(samNode, 'sam.nightowlshq.dusk', '2'), take(mayaNode, 'maya.nightowlshq.dusk', '3')]
  const read = (activity: { feeds: SubnameFeed[]; complete: boolean; since?: number }) => activityActions(batch, { label: activityPartyLabel(hex(sam)), subnameActivity: activity })[0]
  expect(read({ feeds, complete: true })).toEqual(expect.objectContaining({ title: '2 subnames changed',
    details: ['sam.nightowlshq.dusk: Taken back by you', 'maya.nightowlshq.dusk: Taken back by you'], actor: { kind: 'authority', authority: hex(sam) } }))
  // Some subnames weren't read: the row can't say how many changed, only which it knows of.
  expect(read({ feeds: feeds.slice(0, 1), complete: false })).toEqual(expect.objectContaining({ title: 'Subnames changed',
    details: ['Including sam.nightowlshq.dusk: Taken back by you'], actor: { kind: 'authority', authority: hex(sam) } }))
  // A subname whose loaded page doesn't reach back to the transaction may hide its part in it.
  const later = { ...take(goneNode, 'old.nightowlshq.dusk', '4'), partial: true, entries: [row('slot_changed', { name: ref(goneNode, '4'), previous: null, current: null, reason: 'Mutation' }, 'tx-later', 600, goneNode)] }
  expect(read({ feeds: [...feeds.slice(0, 1), later], complete: true }).title).toBe('Subnames changed')
  // The subnames were read for the transactions from a time on; an older one, loaded since, may have
  // touched a subname that wasn't read because it hadn't changed since then.
  const since = Date.parse(batch[0].timestamp)
  expect(read({ feeds, complete: true, since }).title).toBe('2 subnames changed')
  expect(read({ feeds, complete: true, since: since + 1 }).title).toBe('Subnames changed')
})

it('keeps the fallback for a transaction made before a subname may have left the namespace', () => {
  // One take-back of sam., maya. and old.; old. is removed afterwards, so it is neither listed nor read.
  const take = (node: number[], name: string, serial: string): SubnameFeed => ({ name, node: hex(node), holders: { owner: hex(sam), manager: hex(sam) }, partial: false, entries: [
    row('authorities_changed', { name: subname(node, serial, name.split('.')[0], sam, sam), previous_owner: maya, previous_manager: maya, actor: sam, reason: 'TakeBack', data_cleared: true }, 'tx-batch', 500, node),
  ] })
  const feeds = [take(samNode, 'sam.nightowlshq.dusk', '2'), take(mayaNode, 'maya.nightowlshq.dusk', '3')]
  const batch = counters('tx-batch', 500, '5', '9')
  const read = (entries: ActivityEntry[], more: SubnameFeed[] = []) => activityActions(entries, { label: activityPartyLabel(hex(sam)),
    subnameActivity: { feeds: [...feeds, ...more], complete: true } }).map(({ title, details }) => ({ title, details }))
  const fallback = { title: 'Subnames changed', details: ['Including sam.nightowlshq.dusk: Taken back by you; maya.nightowlshq.dusk: Taken back by you'] }
  // A removal leaves only the root's counters on the parent, which no subname read since explains.
  expect(read([counters('tx-remove', 510, '5', '10'), batch])).toEqual([{ title: 'Subname changed', details: [] }, fallback])
  // So does one made through a controller, which leaves its mark on the root too.
  expect(read([row('controller_used', { principal: null, via: bytes(0x55), scope: 1 }, 'tx-remove', 510), counters('tx-remove', 510, '5', '10'), batch])[1]).toEqual(fallback)
  // Re-registering the root, or creating a subname again over its old subtree, also removes names.
  expect(read([row('subtree_removed', { target: { key: { root, node: root } }, include_target: false, removed_count: '3', reason: 'Reregistered', actor: sam }, 'tx-again', 520), batch])[1]).toEqual(fallback)
  const recreated = { ...take(goneNode, 'old.nightowlshq.dusk', '6'), entries: [
    row('subname_created', { name: subname(goneNode, '6', 'old', sam, sam), actor: sam }, 'tx-recreate', 530, goneNode),
    row('subtree_removed', { target: ref(goneNode, '4'), include_target: true, removed_count: '2', reason: 'Recreated', actor: sam }, 'tx-recreate', 530, goneNode),
  ] }
  expect(read([counters('tx-recreate', 530, '7', '10'), batch], [recreated])[1]).toEqual(fallback)
  // Created again over an old subtree with names below it, the subname isn't all that its own transaction changed.
  const recreate = (count: string) => read([counters('tx-recreate', 530, '7', '10')], [{ ...recreated, entries: [recreated.entries[0],
    row('subtree_removed', { target: ref(goneNode, '4'), include_target: true, removed_count: count, reason: 'Recreated', actor: sam }, 'tx-recreate', 530, goneNode)] }])[0]
  expect(recreate('2')).toEqual({ title: 'Subnames changed', details: ['Including Subname old.nightowlshq.dusk created'] })
  expect(recreate('1')).toEqual({ title: 'Subname old.nightowlshq.dusk created', details: [] })
  // Without any of these since, the subnames read are all it touched.
  expect(read([batch])[0]).toEqual({ title: '2 subnames changed', details: ['sam.nightowlshq.dusk: Taken back by you', 'maya.nightowlshq.dusk: Taken back by you'] })
  // A removal before it, or a later change a subname read explains, doesn't matter to it.
  const samRecord = { ...feeds[0], entries: [...recordWrite(samNode, 'tx-sam-record', 505), ...feeds[0].entries] }
  expect(activityActions([counters('tx-sam-record', 505, '5', '10'), batch, counters('tx-remove', 490, '5', '8')], { label: activityPartyLabel(hex(sam)),
    subnameActivity: { feeds: [samRecord, feeds[1]], complete: true } })[1].title).toBe('2 subnames changed')
})

it('reads the activity of subnames changed since the oldest unexplained parent transaction, within a bound', async () => {
  const pages = new Map<string, ActivityEntry[]>([[hex(samNode), samFeed.entries], [hex(mayaNode), mayaFeed.entries]])
  const getActivityPage = vi.fn(async (node: string) => {
    if (node === hex(goneNode)) throw new Error('Indexer unavailable')
    return { activity: pages.get(node) ?? [], nextCursor: node === hex(mayaNode) ? 'more' : null }
  })
  const client = { getActivityPage, getAllActivity: vi.fn() } as unknown as DuskDomainsIndexerClient
  const state = (node: number[], name: string, updatedAt: string | undefined, owner = sam, manager = sam) =>
    ({ name, node: hex(node), owner: hex(owner), manager: hex(manager), ...(updatedAt ? { updatedAt } : {}) })
  const subnames = [
    state(samNode, 'sam.nightowlshq.dusk', parent[1].timestamp),
    state(mayaNode, 'maya.nightowlshq.dusk', parent[3].timestamp, sam, maya),
    state(goneNode, 'old.nightowlshq.dusk', undefined),
    // Unchanged since before the oldest unexplained transaction: nothing to explain.
    state(bytes(12), 'quiet.nightowlshq.dusk', '2026-10-01T00:00:00.000Z'),
  ]
  const loaded = await loadSubnameActivity(client, parent, subnames)
  expect(getActivityPage.mock.calls.map(([node]) => node).sort()).toEqual([hex(samNode), hex(mayaNode), hex(goneNode)].sort())
  expect(loaded.feeds).toEqual([
    { name: 'sam.nightowlshq.dusk', node: hex(samNode), holders: { owner: hex(sam), manager: hex(sam) }, entries: samFeed.entries, partial: false },
    { name: 'maya.nightowlshq.dusk', node: hex(mayaNode), holders: { owner: hex(sam), manager: hex(maya) }, entries: mayaFeed.entries, partial: true },
  ])
  // A failed read leaves the set incomplete. What was read holds for transactions from the oldest one on.
  expect(loaded.complete).toBe(false)
  expect(loaded.since).toBe(Date.parse(parent[parent.length - 1].timestamp))
  expect((await loadSubnameActivity(client, parent, subnames.slice(0, 2))).complete).toBe(true)
  // Explained parent rows need no reads, and the reads stay bounded.
  getActivityPage.mockClear()
  expect(await loadSubnameActivity(client, [row('root_registered', { name: {}, payer: null }, 'tx-register', 400)], subnames)).toEqual({ feeds: [], complete: true })
  expect(getActivityPage).not.toHaveBeenCalled()
  // A change made through a controller leaves the controller's mark on the root as well, and is read too.
  const via = [row('controller_used', { principal: null, via: bytes(0x55), scope: 1 }, 'tx-via', 500), counters('tx-via', 500, '4', '9')]
  expect((await loadSubnameActivity(client, via, [state(samNode, 'sam.nightowlshq.dusk', undefined)])).feeds.map(feed => feed.name)).toEqual(['sam.nightowlshq.dusk'])
  getActivityPage.mockClear()
  const many = Array.from({ length: 40 }, (_, index) => state(bytes(100 + index), `s${index}.nightowlshq.dusk`, undefined))
  // Subnames past the bound aren't read, so the set is incomplete.
  expect((await loadSubnameActivity(client, parent, many, { maxSubnames: 16 })).complete).toBe(false)
  expect(getActivityPage).toHaveBeenCalledTimes(16)
  // The whole history, for the download, reads every page of each subname.
  const getAllActivity = vi.mocked(client.getAllActivity).mockResolvedValue(samFeed.entries)
  expect(await loadSubnameActivity(client, parent, [subnames[0]], { full: true })).toMatchObject({ feeds: [{ name: 'sam.nightowlshq.dusk', partial: false }], complete: true })
  expect(getAllActivity).toHaveBeenCalledWith(hex(samNode), expect.any(Number))
})

it('fills the CSV byline with the address behind an account when it is known', () => {
  const address = account
  const parsed = contractPrincipalFromWalletAccount(address)
  if (!parsed.ok) throw new Error('Invalid fixture')
  const owner = parsed.principal.slice(2).match(/../g)!.map(pair => parseInt(pair, 16))
  const feed = { ...samFeed, holders: { owner: hex(owner), manager: hex(owner) }, entries: [
    row('authorities_changed', { name: subname(samNode, '2', 'sam', owner, owner), previous_owner: owner, previous_manager: owner, actor: owner, reason: 'Holder', data_cleared: true }, 'tx-take', 480, samNode),
  ] }
  const csv = activityCsv([parent[1]], { addresses: [address], subnameActivity: { feeds: [feed], complete: true } })
  expect(csv).toContain(`"sam.nightowlshq.dusk: Records and primary name cleared","","${address}"`)
  expect(csv).not.toContain(hex(owner))
  expect(encodeBase58(mayaKey)).not.toBe(address)
})

it('keeps when the indexer last saw each subname change, to pick which to read', () => {
  const indexed = { parentName: 'nightowlshq.dusk', parentNode: hex(root), label: 'sam', name: 'sam.nightowlshq.dusk', node: hex(samNode), owner: hex(sam), manager: hex(sam),
    resolver: '', expiresAt: '', parentExpiresAt: '', expiryPolicy: 'inherits_parent', createdAt: '', status: 'active', lastEventType: '', txId: null, blockHeight: null } as const
  expect(indexedSubnameToState({ ...indexed, updatedAt: '2026-10-11T19:38:13.000Z' } as never).updatedAt).toBe('2026-10-11T19:38:13.000Z')
  expect(indexedSubnameToState({ ...indexed, updatedAt: 'not a date' } as never)).not.toHaveProperty('updatedAt')
  expect(indexedSubnameToState(indexed as never)).not.toHaveProperty('updatedAt')
})
