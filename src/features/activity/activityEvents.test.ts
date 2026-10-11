import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { contractPrincipalFromWalletAccount, encodeBase58, type ActivityEntry } from '../../names/internal'
import { abbreviate } from '../../utils/format'
import { activityActions, activityPartyLabel } from './activityActions'
import { activityCsv } from './activityCsv'

// Rows shaped like the frozen indexer's /activity output: SDK topic, canonical body, byte arrays.
const bytes = (fill: number, length = 32) => Array(length).fill(fill) as number[]
const hex = (value: number[]) => `0x${value.map(byte => byte.toString(16).padStart(2, '0')).join('')}`
const root = bytes(7)
const node = hex(root)
const nameRef = { key: { root, node: root }, incarnation: { generation: '1', serial: '1' } }
const ownerKey = Array.from({ length: 96 }, (_, index) => (index * 7 + 3) % 256)
const buyerKey = Array.from({ length: 96 }, (_, index) => (index * 11 + 5) % 256)
const owner = encodeBase58(ownerKey)
const buyer = encodeBase58(buyerKey)
const sellerAuthority = bytes(0x11)
const buyerAuthority = bytes(0x22)
const market = bytes(0x05)
const moonlight = (key: number[]) => ({ kind: 'Moonlight', bytes: key })
const utf8 = (value: string) => [...new TextEncoder().encode(value)]

let counter = 0
// The name's store emits its events; its resolver slots are keyed by the same registry.
const store = hex(bytes(0x7f))
function row(eventType: string, data: unknown, { tx = 'tx-1', height = 100, timestamp = '2026-10-11T12:47:13.000Z', at = node } = {}): ActivityEntry {
  counter += 1
  return { id: `${tx}:${counter}`, eventType, node: at, contractId: store, name: '', actor: '', timestamp, blockHeight: height, txId: tx, data } as ActivityEntry
}

const counters = (nextSerial: string, revision: string) => ({ root, counters: { generation: '1', next_serial: nextSerial, next_epoch: '2', next_custody: '1', revision } })
const slot = (epoch = '1') => ({ registry: bytes(0x7f), node: root, epoch })
const record = (key: string, value: number[], updatedAt: number) => ({ key, value, ttl_seconds: '300', updated_at: String(updatedAt) })
type RecordRow = ReturnType<typeof record>
// A record set's digest, which the store's pointer and the resolver's snapshot of that set share.
const digestOf = (records: RecordRow[]) => [...createHash('sha256').update(JSON.stringify(records)).digest()]
const pointer = (records: RecordRow[], epoch = '1') => ({ resolver: bytes(0xab), epoch, count: records.length, digest: digestOf(records) })
const snapshot = (records: RecordRow[], epoch = '1') => ({ slot: slot(epoch), snapshot: { records, count: records.length, digest: digestOf(records) } })
const name = (fields: Record<string, unknown> = {}) => ({ ...nameRef, label: 'alpha', owner: sellerAuthority, manager: sellerAuthority,
  expires_at: '3153700', grace_end: '3412900', referrer: null, subname: null, records: null, custody: null, ...fields })
const terms = (kind: string, amount: string, fields: Record<string, unknown> = {}) => ({ version: 1, directory: bytes(1), store: bytes(0x7f), name: nameRef,
  id: '4', kind, amount_lux: amount, fee_bps: 250, seller: sellerAuthority, seller_manager: sellerAuthority, seller_recipient: ownerKey,
  buyer: null, buyer_manager: null, deadline: '9000', duration_blocks: '0', referral: null, ...fields })
const order = (kind: string, amount: string, fields: Record<string, unknown> = {}, termFields: Record<string, unknown> = {}) => ({
  terms: terms(kind, amount, termFields), nonce: '1', status: 'Open', payer: null, highest: null, started_at: null, end: null, maximum_end: null, bid_count: 0, ...fields })

// Newest first, as the indexer serves them.
const registration = (tx = 'tx-register', height = 100) => [
  row('root_counters_changed', counters('2', '1'), { tx, height }),
  row('primary_changed', { endpoint: ownerKey, previous: null, current: { endpoint: ownerKey, name: nameRef, mapping_id: '1', updated_at: String(height) }, reason: 'Set' }, { tx, height }),
  row('slot_changed', { name: nameRef, previous: null, current: pointer([record('moonlight_address', ownerKey, height)]), reason: 'Initial' }, { tx, height }),
  row('resolver_slot_written', snapshot([record('moonlight_address', ownerKey, height)]), { tx, height }),
  row('root_registered', { name: name({ expires_at: String(height + 3_153_600) }), previous_generation: '0', reason: 'Paid', payer: moonlight(ownerKey),
    fee_lux: '10000000000', premium_lux: '0', referral_lux: '0', policy: bytes(2), policy_version: '1', policy_config_version: '1' }, { tx, height }),
]

describe('activity actions', () => {
  it('shows a registration as one plain action, folding its records, primary name and counters', () => {
    const [action, ...rest] = activityActions(registration())
    expect(rest).toEqual([])
    expect(action.title).toBe('Registered for 1 year · 10 DUSK')
    expect(action.details).toEqual(['Record set: Dusk address', 'Set as primary name'])
    expect(action.actor).toEqual({ kind: 'address', address: owner })
    expect(action.txId).toBe('tx-register')
  })

  it('never titles an action with internal bookkeeping', () => {
    const titles = activityActions([
      row('root_counters_changed', counters('3', '4'), { tx: 'tx-sub', height: 120 }),
      ...registration(),
    ]).map(action => action.title)
    expect(titles.join(' ')).not.toMatch(/counters|slot|custody|order changed/i)
  })

  it('names the records a write changed, comparing the previous snapshot', () => {
    const website = utf8('https://alpha.example')
    const registered = [record('moonlight_address', ownerKey, 100)]
    const edited = [record('moonlight_address', ownerKey, 100), record('website', website, 120), record('avatar', utf8('https://a.example/a.png'), 120)]
    const removed = [record('moonlight_address', ownerKey, 100), record('avatar', utf8('https://a.example/a.png'), 120)]
    const actions = activityActions([
      row('root_counters_changed', counters('2', '3'), { tx: 'tx-remove', height: 140 }),
      row('slot_changed', { name: nameRef, previous: pointer(edited), current: pointer(removed), reason: 'Mutation' }, { tx: 'tx-remove', height: 140 }),
      row('resolver_slot_written', snapshot(removed), { tx: 'tx-remove', height: 140 }),
      row('root_counters_changed', counters('2', '2'), { tx: 'tx-edit', height: 120 }),
      row('slot_changed', { name: nameRef, previous: pointer(registered), current: pointer(edited), reason: 'Mutation' }, { tx: 'tx-edit', height: 120 }),
      row('resolver_slot_written', snapshot(edited), { tx: 'tx-edit', height: 120 }),
      ...registration(),
    ])
    expect(actions.map(action => action.title)).toEqual([
      'Record removed: Website',
      'Records updated: Website, Avatar',
      'Registered for 1 year · 10 DUSK',
    ])
  })

  it('falls back to the records stamped in the same block when the previous snapshot is not loaded', () => {
    const [action] = activityActions([
      row('slot_changed', { name: nameRef, previous: pointer([record('moonlight_address', ownerKey, 100)]),
        current: pointer([record('moonlight_address', ownerKey, 100), record('text.description', utf8('Hi'), 120)]), reason: 'Mutation' }, { tx: 'tx-edit', height: 120 }),
      row('resolver_slot_written', snapshot([record('moonlight_address', ownerKey, 100), record('text.description', utf8('Hi'), 120)]), { tx: 'tx-edit', height: 120 }),
    ])
    expect(action.title).toBe('Record updated: Description')
  })

  it('reads listings, bids, offers and sales with their prices and parties', () => {
    const sale = 'tx-sale', listing = 'tx-list'
    const actions = activityActions([
      row('order_closed', { order: order('Offer', '28000000000', { payer: moonlight(buyerKey) }, { buyer: buyerAuthority }), reason: 'Cancelled' }, { tx: 'tx-offer-cancel', height: 160 }),
      row('order_changed', { order: order('Offer', '28000000000', { payer: moonlight(buyerKey) }, { buyer: buyerAuthority }) }, { tx: 'tx-offer', height: 150 }),
      row('root_counters_changed', counters('2', '6'), { tx: sale, height: 140 }),
      row('trade_settled', { order: order('Fixed', '30000000000'), payer: moonlight(buyerKey), buyer: buyerAuthority, manager: buyerAuthority,
        gross_lux: '30000000000', fee_lux: '750000000', referral_lux: '0' }, { tx: sale, height: 140 }),
      row('order_closed', { order: order('Fixed', '30000000000'), reason: 'Sold' }, { tx: sale, height: 140 }),
      row('identity_cleared', { name: nameRef, old_slot: pointer([record('moonlight_address', ownerKey, 100)]), old_primary: null, reason: 'CustodySale' }, { tx: sale, height: 140 }),
      row('custody_ended', { name: nameRef, nonce: '1', reason: 'Sold' }, { tx: sale, height: 140 }),
      row('authorities_changed', { name: name({ owner: buyerAuthority, manager: buyerAuthority }), previous_owner: market, previous_manager: market,
        actor: market, reason: 'CustodySale', data_cleared: true }, { tx: sale, height: 140 }),
      row('order_changed', { order: order('Fixed', '30000000000') }, { tx: listing, height: 130 }),
      row('root_counters_changed', counters('2', '5'), { tx: listing, height: 130 }),
      row('authorities_changed', { name: name({ owner: market, manager: market }), previous_owner: sellerAuthority, previous_manager: sellerAuthority,
        actor: sellerAuthority, reason: 'CustodyStart', data_cleared: false }, { tx: listing, height: 130 }),
      row('custody_started', { name: nameRef, custody: { nonce: '1' }, callback_data_hash: bytes(3) }, { tx: listing, height: 130 }),
    ], { marketplaceContractId: hex(market) })
    expect(actions.map(action => action.title)).toEqual([
      `Offer of 28 DUSK cancelled`,
      'Offer of 28 DUSK',
      `Sold to ${abbreviate(buyer)} for 30 DUSK`,
      'Listed for 30 DUSK',
    ])
    expect(actions[2].details).toEqual(['Market fee: 0.75 DUSK', 'Records and primary name cleared'])
    expect(actions[2].actor).toEqual({ kind: 'address', address: buyer })
    expect(actions[3].actor).toEqual({ kind: 'authority', authority: hex(sellerAuthority) })
  })

  it('shows a seller by the payout address their authority listed from', () => {
    // A valid Moonlight key: the authority of this address is its hash.
    const sellerKey = [151,131,247,27,74,84,187,248,198,120,185,176,16,222,147,62,81,119,60,34,225,133,12,65,121,245,86,167,61,122,1,78,111,106,73,147,200,80,240,145,240,198,205,217,106,28,221,173,1,77,78,212,69,122,17,222,133,201,167,91,224,81,16,7,176,221,142,99,193,249,135,250,61,122,244,29,148,25,227,59,135,24,237,143,246,165,30,185,236,48,105,84,230,204,184,209]
    const address = encodeBase58(sellerKey)
    const principal = contractPrincipalFromWalletAccount(address)
    if (!principal.ok) throw new Error('fixture address')
    const sellerBytes = principal.principal.slice(2).match(/../g)!.map(pair => parseInt(pair, 16))
    const [listed] = activityActions([row('order_changed', { order: order('Fixed', '30000000000', {}, { seller: sellerBytes, seller_recipient: sellerKey }) }),
      row('custody_started', { name: nameRef, custody: { nonce: '1' } })])
    expect(listed).toMatchObject({ title: 'Listed for 30 DUSK', actor: { kind: 'address', address } })
  })

  it('reads auctions, bids and returns from the market', () => {
    const actions = activityActions([
      row('order_closed', { order: order('Fixed', '40000000000', { status: 'ReturnPending' }), reason: 'Returned' }, { tx: 'tx-return', height: 190 }),
      row('custody_ended', { name: nameRef, nonce: '2', reason: 'Returned' }, { tx: 'tx-return', height: 190 }),
      row('authorities_changed', { name: name(), previous_owner: market, previous_manager: market, actor: market, reason: 'CustodyReturn', data_cleared: false }, { tx: 'tx-return', height: 190 }),
      row('order_closed', { order: order('Fixed', '40000000000', { status: 'ReturnPending' }), reason: 'Cancelled' }, { tx: 'tx-cancel', height: 180 }),
      row('order_changed', { order: order('Auction', '60000000000', { highest: { payer: moonlight(buyerKey), manager: buyerAuthority, amount_lux: '66000000000' }, bid_count: 2 }) }, { tx: 'tx-bid', height: 170 }),
      row('order_changed', { order: order('Auction', '60000000000') }, { tx: 'tx-auction', height: 160 }),
      row('custody_started', { name: nameRef, custody: { nonce: '1' }, callback_data_hash: bytes(3) }, { tx: 'tx-auction', height: 160 }),
    ])
    expect(actions.map(action => action.title)).toEqual([
      'Returned from the market',
      'Listing cancelled',
      'Bid of 66 DUSK',
      'Auction started · minimum bid 60 DUSK',
    ])
  })

  it('reads renewals with the new expiry date when the chain height is known', () => {
    const renew = row('root_renewed', { root: nameRef, old_expiry: '3153700', expires_at: '6307300', old_grace_end: '3412900', grace_end: '6566500',
      inheritance_rule: 1, years: 1, payer: moonlight(ownerKey), fee_lux: '10000000000', referral_lux: '0', schedule_version: '1' }, { tx: 'tx-renew', height: 200 })
    const now = Date.parse('2026-10-11T12:00:00Z') / 1000
    expect(activityActions([renew], { currentBlockHeight: 200, nowSeconds: now })[0].title).toBe('Renewed to 2028-10-10 · 1 year · 10 DUSK')
    expect(activityActions([renew])[0].title).toBe('Renewed for 1 year · 10 DUSK')
  })

  it('reads primary name changes and transfers', () => {
    const primary = (reason: string) => row('primary_changed', { endpoint: ownerKey, previous: null, current: reason === 'Set' ? { endpoint: ownerKey, name: nameRef } : null, reason }, { tx: `tx-${reason}` })
    expect(activityActions([primary('Set')])[0]).toMatchObject({ title: 'Primary name set', actor: { kind: 'address', address: owner } })
    expect(activityActions([primary('Clear')])[0].title).toBe('Primary name cleared')
    const transfer = row('authorities_changed', { name: name({ owner: buyerAuthority, manager: buyerAuthority }), previous_owner: sellerAuthority,
      previous_manager: sellerAuthority, actor: sellerAuthority, reason: 'Holder', data_cleared: true }, { tx: 'tx-transfer' })
    const [moved] = activityActions([transfer], { label: activityPartyLabel(hex(buyerAuthority)) })
    expect(moved.title).toBe('Transferred to you')
    expect(moved.details).toEqual(['Records and primary name cleared'])
    const manager = row('authorities_changed', { name: name({ manager: buyerAuthority }), previous_owner: sellerAuthority, previous_manager: sellerAuthority,
      actor: sellerAuthority, reason: 'Holder', data_cleared: false }, { tx: 'tx-manager' })
    expect(activityActions([manager])[0].title).toBe(`Manager changed to Owner ID ${abbreviate(hex(buyerAuthority))}`)
  })

  it('reads subname creation, take-back and removal on the subname, and subname changes on its parent', () => {
    const subRoot = bytes(9)
    const subRef = { key: { root, node: subRoot }, incarnation: { generation: '1', serial: '3' } }
    const created = row('subname_created', { name: { ...name({ owner: sellerAuthority, manager: buyerAuthority }), ...subRef, label: 'maya',
      subname: { parent: root, depth: 1, expiry_policy: 'InheritsParent', created_at: '461' } }, actor: sellerAuthority }, { tx: 'tx-create', height: 461, at: hex(subRoot) })
    expect(activityActions([created])[0].title).toBe(`Created and given to Owner ID ${abbreviate(hex(buyerAuthority))}`)
    const takeBack = row('authorities_changed', { name: { ...name(), ...subRef }, previous_owner: sellerAuthority, previous_manager: buyerAuthority,
      actor: sellerAuthority, reason: 'TakeBack', data_cleared: true }, { tx: 'tx-take', height: 470, at: hex(subRoot) })
    expect(activityActions([takeBack], { label: activityPartyLabel(hex(sellerAuthority)) })[0]).toMatchObject({ title: 'Taken back by you', details: ['Records and primary name cleared'] })
    const removed = row('subtree_removed', { target: subRef, include_target: true, removed_count: 1, reason: 'Removed', actor: sellerAuthority }, { tx: 'tx-remove', height: 480, at: hex(subRoot) })
    expect(activityActions([removed])[0]).toMatchObject({ title: 'Subname removed', actor: { kind: 'authority', authority: hex(sellerAuthority) } })

    const parent = activityActions([
      row('root_counters_changed', counters('4', '6'), { tx: 'tx-other', height: 470 }),
      row('root_counters_changed', counters('4', '5'), { tx: 'tx-create', height: 461 }),
      row('root_counters_changed', counters('3', '4'), { tx: 'tx-first', height: 457 }),
      row('root_counters_changed', counters('2', '3'), { tx: 'tx-older', height: 440 }),
    ], { subnames: [{ name: 'maya.alpha.dusk', serial: '3' }] })
    expect(parent.map(action => action.title)).toEqual(['Subname changed', 'Subname maya.alpha.dusk created', 'Subname created', 'Subname changed'])
  })

  it('reads dropped-name premiums, free and reserved registrations', () => {
    const [premium] = activityActions([row('root_registered', { name: name({ expires_at: String(100 + 2 * 3_153_600) }), reason: 'Paid', payer: moonlight(ownerKey),
      fee_lux: '35000000000', premium_lux: '15000000000', referral_lux: '0' })])
    expect(premium).toMatchObject({ title: 'Registered for 2 years · 35 DUSK', details: ['Includes a 15 DUSK premium'] })
    expect(activityActions([row('root_registered', { name: name(), reason: 'Reserved', payer: moonlight(ownerKey), fee_lux: '0', premium_lux: '0' })])[0].title)
      .toBe('Issued as a reserved name for 1 year')
  })

  it('keeps the labels of entries the app adds before the indexer confirms them', () => {
    const local = { id: 'local', eventType: 'record_update', node, name: 'alpha.dusk', actor: hex(sellerAuthority), target: 'website', timestamp: '', blockHeight: null, txId: 'tx' } as ActivityEntry
    expect(activityActions([local])[0]).toMatchObject({ title: 'Record updated', details: ['Website'] })
  })
})

it('reads a renewal paid while the name is listed as a renewal', () => {
  const [action] = activityActions([
    row('order_changed', { order: order('Fixed', '30000000000') }, { tx: 'tx-renew' }),
    row('root_renewed', { root: nameRef, years: 2, expires_at: '9000000', payer: moonlight(ownerKey), fee_lux: '20000000000' }, { tx: 'tx-renew' }),
  ])
  expect(action.title).toBe('Renewed for 2 years · 20 DUSK')
})

it('credits an accepted offer to the seller, and a finished auction to nobody in particular', () => {
  const settled = (kind: string, tx: string) => row('trade_settled', { order: order(kind, '30000000000', { payer: moonlight(buyerKey) }, kind === 'Offer' ? { buyer: buyerAuthority } : {}),
    payer: moonlight(buyerKey), buyer: buyerAuthority, manager: buyerAuthority, gross_lux: '30000000000', fee_lux: '0', referral_lux: '0' }, { tx })
  const [offer] = activityActions([settled('Offer', 'tx-accept')])
  expect(offer.title).toBe(`Offer accepted: sold to ${abbreviate(buyer)} for 30 DUSK`)
  expect(offer.actor).toEqual({ kind: 'authority', authority: hex(sellerAuthority) })
  // Anyone may finish an auction once it ends, so the winner is in the title, not the byline.
  const [auction] = activityActions([settled('Auction', 'tx-settle')])
  expect(auction.title).toBe(`Sold at auction to ${abbreviate(buyer)} for 30 DUSK`)
  expect(auction.actor).toBeNull()
  const [sale] = activityActions([settled('Fixed', 'tx-buy')])
  expect(sale.actor).toEqual({ kind: 'address', address: buyer })
})

it('names the seller, not the market contract, for a renewal paid from the market', () => {
  const contract = { kind: 'Contract', bytes: market }
  const renewed = row('root_renewed', { root: nameRef, years: 1, expires_at: '9000000', payer: contract, fee_lux: '10000000000' }, { tx: 'tx-escrow-renew' })
  const escrow = row('escrow_renewed', { order_id: '4', renewal: { name: nameRef, years: 1 }, payer: moonlight(ownerKey) }, { tx: 'tx-escrow-renew' })
  expect(activityActions([escrow, renewed], { marketplaceContractId: hex(market) })[0].actor).toEqual({ kind: 'address', address: owner })
  // An indexer older than the holder index files the market's own event under no name; then the byline says the market.
  expect(activityActions([renewed], { marketplaceContractId: hex(market) })[0].actor).toEqual({ kind: 'market' })
})

it('holds back the oldest transaction while more history is still to load', () => {
  // A page that ends inside a registration: the newer half alone would read as "Primary name set".
  const [counter, primary, ...older] = registration()
  const page = [row('root_renewed', { root: nameRef, years: 1, expires_at: '9000000', payer: moonlight(ownerKey), fee_lux: '10000000000' }, { tx: 'tx-renew', height: 300 }), counter, primary]
  expect(activityActions(page, { partial: true }).map(action => action.title)).toEqual(['Renewed for 1 year · 10 DUSK'])
  expect(activityActions([...page, ...older]).map(action => action.title)).toEqual(['Renewed for 1 year · 10 DUSK', 'Registered for 1 year · 10 DUSK'])
  // A page with a single transaction still shows it.
  expect(activityActions([counter, primary], { partial: true })).toHaveLength(1)
})

describe('records, subnames and who acted', () => {
  const website = utf8('https://alpha.example')
  const avatar = utf8('https://alpha.example/a.png')
  const registered = [record('moonlight_address', ownerKey, 100)]
  const withWebsite = [record('moonlight_address', ownerKey, 100), record('website', website, 120)]
  const addWebsite = (tx = 'tx-edit', height = 120) => [
    row('root_counters_changed', counters('2', '2'), { tx, height }),
    row('slot_changed', { name: nameRef, previous: pointer(registered), current: pointer(withWebsite), reason: 'Mutation' }, { tx, height }),
    row('resolver_slot_written', snapshot(withWebsite), { tx, height }),
  ]
  const withBoth = [...withWebsite, record('avatar', avatar, 120)]
  const addAvatar = () => [
    row('root_counters_changed', counters('2', '3'), { tx: 'tx-avatar', height: 120 }),
    row('slot_changed', { name: nameRef, previous: pointer(withWebsite), current: pointer(withBoth), reason: 'Mutation' }, { tx: 'tx-avatar', height: 120 }),
    row('resolver_slot_written', snapshot(withBoth), { tx: 'tx-avatar', height: 120 }),
  ]
  const transferAt = (height: number) => row('authorities_changed', { name: name({ owner: buyerAuthority, manager: buyerAuthority }),
    previous_owner: sellerAuthority, previous_manager: sellerAuthority, actor: sellerAuthority, reason: 'Holder', data_cleared: false }, { tx: 'tx-transfer', height })

  it('reads clearing every record as removing them, not as a subname change', () => {
    // replace_records([]) drops the slot: no resolver write, only the pointer and counters change.
    const clear = [
      row('root_counters_changed', counters('2', '3'), { tx: 'tx-clear', height: 140 }),
      row('slot_changed', { name: nameRef, previous: pointer(withWebsite), current: null, reason: 'Replacement' }, { tx: 'tx-clear', height: 140 }),
    ]
    expect(activityActions([...clear, ...addWebsite(), ...registration()]).map(action => action.title))
      .toEqual(['Records removed: Dusk address, Website', 'Record updated: Website', 'Registered for 1 year · 10 DUSK'])
    // Without the records it replaced, it still reads as clearing them.
    expect(activityActions(clear)[0].title).toBe('All records removed')
  })

  it('compares a replacement with the records it replaced, and calls a move a move', () => {
    const replaced = [record('website', website, 140), record('avatar', avatar, 140)]
    const replace = [
      row('root_counters_changed', counters('2', '3'), { tx: 'tx-replace', height: 140 }),
      row('slot_changed', { name: nameRef, previous: pointer(withWebsite), current: pointer(replaced, '2'), reason: 'Replacement' }, { tx: 'tx-replace', height: 140 }),
      row('resolver_slot_written', snapshot(replaced, '2'), { tx: 'tx-replace', height: 140 }),
    ]
    expect(activityActions([...replace, ...addWebsite(), ...registration()])[0].title).toBe('Records updated: Avatar; removed: Dusk address')
    const move = [
      row('root_counters_changed', counters('2', '3'), { tx: 'tx-move', height: 150 }),
      row('slot_changed', { name: nameRef, previous: pointer(withWebsite), current: pointer(withWebsite, '3'), reason: 'Move' }, { tx: 'tx-move', height: 150 }),
      row('resolver_slot_written', snapshot(withWebsite, '3'), { tx: 'tx-move', height: 150 }),
    ]
    expect(activityActions([...move, ...addWebsite(), ...registration()])[0].title).toBe('Records moved to new storage')
  })

  it('names a created subname by the serial its transaction took, not by its block', () => {
    // maya.alpha.dusk took serial 3 at height 461; another subname changed in the same block.
    const subnames = [{ name: 'maya.alpha.dusk', serial: '3', createdAtBlockHeight: 461 }]
    const parent = activityActions([
      row('root_counters_changed', counters('4', '6'), { tx: 'tx-edit', height: 461 }),
      row('root_counters_changed', counters('4', '5'), { tx: 'tx-create', height: 461 }),
      row('root_counters_changed', counters('3', '4'), { tx: 'tx-older', height: 440 }),
    ], { subnames })
    expect(parent.map(action => action.title)).toEqual(['Subname changed', 'Subname maya.alpha.dusk created', 'Subname changed'])
    // The oldest loaded counters have nothing to compare with, so a matching block proves nothing.
    expect(activityActions([row('root_counters_changed', counters('4', '5'), { tx: 'tx-create', height: 461 })], { subnames })[0].title).toBe('Subname changed')
  })

  it('credits a record change to the name\'s holder when one wallet owns and manages it', () => {
    const one = { owner: hex(sellerAuthority), manager: hex(sellerAuthority) }
    const seller = { kind: 'authority', authority: hex(sellerAuthority) }
    // The registration loaded below says who held the name.
    expect(activityActions([...addWebsite(), ...registration()])[0].actor).toEqual(seller)
    // Otherwise the name's current owner and manager do.
    expect(activityActions(addWebsite(), { holders: one })[0].actor).toEqual(seller)
    // A manager who is not the owner could have signed it too, so nobody is named.
    expect(activityActions(addWebsite(), { holders: { ...one, manager: hex(buyerAuthority) } })[0].actor).toBeNull()
    expect(activityActions(addWebsite())[0].actor).toBeNull()
    // A change made before a transfer belongs to the holder before it.
    const transfer = row('authorities_changed', { name: name({ owner: buyerAuthority, manager: buyerAuthority }), previous_owner: sellerAuthority,
      previous_manager: sellerAuthority, actor: sellerAuthority, reason: 'Holder', data_cleared: false }, { tx: 'tx-transfer', height: 130 })
    const [moved, edited] = activityActions([transfer, ...addWebsite()], { holders: { owner: hex(buyerAuthority), manager: hex(buyerAuthority) } })
    expect(moved.title).toBe(`Transferred to Owner ID ${abbreviate(hex(buyerAuthority))}`)
    expect(edited.actor).toEqual(seller)
    // A change after the manager changed has two possible signers.
    const manager = row('authorities_changed', { name: name({ manager: buyerAuthority }), previous_owner: sellerAuthority, previous_manager: sellerAuthority,
      actor: sellerAuthority, reason: 'Holder', data_cleared: false }, { tx: 'tx-manager', height: 110 })
    expect(activityActions([...addWebsite(), manager, ...registration()])[0].actor).toBeNull()
    // The CSV's By column carries it too.
    expect(activityCsv([...addWebsite(), ...registration()], {}).trim().split('\r\n')[2]).toContain(`"${hex(sellerAuthority)}"`)
  })

  // The indexer orders rows by block. Transactions in one block may arrive in either order.
  it('reads transactions in one block the same way, whichever order their rows arrive in', () => {
    for (const rows of [[...addAvatar(), ...addWebsite()], [...addWebsite(), ...addAvatar()]]) {
      const titles = new Map(activityActions([...rows, ...registration()]).map(action => [action.txId, action.title]))
      expect(titles.get('tx-edit')).toBe('Record updated: Website')
      expect(titles.get('tx-avatar')).toBe('Record updated: Avatar')
    }
    // maya.alpha.dusk took serial 3 and zed.alpha.dusk serial 4, one transaction after the other.
    const subnames = [{ name: 'maya.alpha.dusk', serial: '3' }, { name: 'zed.alpha.dusk', serial: '4' }]
    const maya = row('root_counters_changed', counters('4', '5'), { tx: 'tx-maya', height: 461 })
    const zed = row('root_counters_changed', counters('5', '6'), { tx: 'tx-zed', height: 461 })
    const older = row('root_counters_changed', counters('3', '4'), { tx: 'tx-older', height: 440 })
    for (const rows of [[zed, maya, older], [maya, zed, older]]) {
      const titles = new Map(activityActions(rows, { subnames }).map(action => [action.txId, action.title]))
      expect(titles.get('tx-maya')).toBe('Subname maya.alpha.dusk created')
      expect(titles.get('tx-zed')).toBe('Subname zed.alpha.dusk created')
    }
  })

  it('counts every subname a transaction created, from the counters before its first change', () => {
    // A contract created two subnames in one transaction: two store calls, two counter changes.
    const [action] = activityActions([
      row('root_counters_changed', counters('6', '7'), { tx: 'tx-batch', height: 470 }),
      row('root_counters_changed', counters('5', '6'), { tx: 'tx-batch', height: 470 }),
      row('root_counters_changed', counters('4', '5'), { tx: 'tx-older', height: 440 }),
    ], { subnames: [{ name: 'maya.alpha.dusk', serial: '4' }, { name: 'zed.alpha.dusk', serial: '5' }] })
    expect(action).toMatchObject({ title: 'Subnames created', details: ['maya.alpha.dusk, zed.alpha.dusk'] })
  })

  it('credits nobody when another transaction in the same block changed who holds the name', () => {
    // The seller wrote a record and transferred the name in one block; the rows don't say which came first.
    const holders = { owner: hex(buyerAuthority), manager: hex(buyerAuthority) }
    for (const rows of [[...addWebsite(), transferAt(120)], [transferAt(120), ...addWebsite()]]) {
      const edit = activityActions([...rows, ...registration()], { holders }).find(action => action.txId === 'tx-edit')
      expect(edit).toMatchObject({ title: 'Record updated: Website', actor: null })
    }
  })

  it('holds back the oldest loaded block while more history is still to load', () => {
    // The page ends inside block 120, where a transfer is still to load: the writes there can't be read yet.
    const holders = { owner: hex(buyerAuthority), manager: hex(buyerAuthority) }
    const renew = row('root_renewed', { root: nameRef, years: 1, expires_at: '9000000', payer: moonlight(buyerKey), fee_lux: '10000000000' }, { tx: 'tx-renew', height: 300 })
    const page = [renew, ...addAvatar(), ...addWebsite()]
    expect(activityActions(page, { partial: true, holders }).map(action => action.txId)).toEqual(['tx-renew'])
    const all = activityActions([...page, transferAt(120), ...registration()], { holders })
    expect(all.map(action => [action.txId, action.actor])).toEqual([
      ['tx-renew', { kind: 'address', address: buyer }], ['tx-avatar', null], ['tx-edit', null], ['tx-transfer', { kind: 'authority', authority: hex(sellerAuthority) }],
      ['tx-register', { kind: 'address', address: owner }],
    ])
  })

  it('says a move copied the records, and credits nobody, when only the new registry wrote them', () => {
    // Staging a move to another registry writes the records there. Anyone can do it, and the name's pointer stays put.
    const staged = row('resolver_slot_written', { slot: { registry: bytes(0x6e), node: root, epoch: '1' },
      snapshot: { records: withWebsite, count: 2, digest: digestOf(withWebsite) } }, { tx: 'tx-stage', height: 160 })
    const one = { owner: hex(sellerAuthority), manager: hex(sellerAuthority) }
    expect(activityActions([staged, ...addWebsite(), ...registration()], { holders: one })[0])
      .toMatchObject({ title: 'Records copied for a move to another registry', actor: null })
  })
})
