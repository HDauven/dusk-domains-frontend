import { encodeBase58, type ActivityEntry } from '../../names/internal'
import { sameAuthority } from '../identity/ownerLabel'
import { pluralize } from '../../utils/format'
import { formatLifecycleDay } from '../domains/domainFormat'
import { formatLuxNumberAsDusk } from '../treasury/feeConfig'
import { recordLabel } from './activityCopy'

// The frozen indexer serves each contract event with its SDK topic and canonical body:
// byte arrays for keys and IDs, decimal strings for u64 values. One transaction emits
// several events; these helpers read them as the one action a person took.

export type ActivityParty =
  | { kind: 'address'; address: string }
  | { kind: 'authority'; authority: string }
  | { kind: 'contract'; contract: string }
  | { kind: 'market' }

export type ActivityContext = {
  /** Text for a party: "you", a short address or an owner ID. Defaults to one built from the viewer and addresses. */
  label?: (party: ActivityParty) => string
  viewerAuthority?: string | null
  /** Dusk addresses known to belong to the name's holders, to show owners by address. */
  addresses?: readonly string[]
  /** The chain height and clock that dated expiry heights. */
  currentBlockHeight?: number | null
  nowSeconds?: number
  marketplaceContractId?: string | null
  /** The name's current owner and manager, to credit changes only they could make. */
  holders?: Holders | null
  /** The name's subnames with the serial each took when it was created, to name the one a parent-level change created. */
  subnames?: readonly { name: string; serial?: string | null }[]
  /** Older rows are still to load, so the oldest loaded transaction may be cut off. */
  partial?: boolean
  /** The activity of subnames below this name. The indexer files a subname's events under the subname,
   * so on this name a subname change shows only as its root's counters changing. */
  subnameActivity?: SubnameActivityFeeds
  /** What each transaction did to subnames, described from subnameActivity. */
  related?: ReadonlyMap<string, readonly RelatedAction[]>
  /** Where a subname may have left the namespace, described from subnameActivity. */
  removals?: readonly SubnameRemoval[]
  /** The subname whose own events are being described for its parent's feed. */
  subject?: string
}

type Holders = { owner: string; manager: string }

/** A subname's own activity, as its page reads it, with its current holders. */
export type SubnameActivityFeed = { name: string; node: string; holders: Holders; entries: ActivityEntry[]; partial: boolean }
/**
 * Subnames' own activity, and whether every subname that could have changed was read. `since` is the
 * time that holds from: the subnames changed at or after it were read, so an older transaction may
 * have touched one that wasn't.
 */
export type SubnameActivityFeeds = { feeds: readonly SubnameActivityFeed[]; complete: boolean; since?: number }
/** One subname's part in a transaction. */
export type RelatedAction = { name: string; title: string; details: string[]; actor: ActivityParty | null }
/**
 * A transaction after which a subname may be gone from the namespace, and so from today's subnames.
 * `removedOthers`: it removed names besides the subname whose activity shows it, so it hides part of
 * its own transaction too.
 */
export type SubnameRemoval = { txId: string | null; blockHeight: number | null; removedOthers?: boolean }

// The indexer files a subname's events under the subname. On the root, a subname transaction leaves
// only the root's counters (and store bookkeeping, and the controller it went through, if any).
const SUBNAME_TRACE = new Set(['root_counters_changed', 'store_watermarks_changed', 'controller_used'])

/** A transaction on the root that only its subnames' activity can explain. */
export function isSubnameTrace(events: readonly ActivityEntry[]) {
  return events.every(event => SUBNAME_TRACE.has(event.eventType)) && events.some(event => event.eventType === 'root_counters_changed')
}

export type DescribedAction = { title: string; details: string[]; actor: ActivityParty | null }

type Row = Record<string, unknown>
type RecordSnapshot = { key: string; value: string; updatedAt: string }[]

// Bookkeeping that belongs to another action in the same transaction.
const bookkeeping = new Set(['root_counters_changed', 'store_watermarks_changed', 'slot_changed', 'resolver_slot_written',
  'resolver_slot_pruned', 'custody_started', 'custody_ended', 'identity_cleared', 'controller_used', 'commitment_created',
  'commitment_removed', 'import_prepared', 'import_row_staged', 'import_ready', 'import_rows_pruned', 'forwarded_rows_pruned',
  'move_progressed'])

const YEAR_BLOCKS = 3_153_600n

const isRow = (value: unknown): value is Row => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const field = (value: unknown, ...path: string[]) => path.reduce<unknown>((current, key) => isRow(current) ? current[key] : undefined, value)
const isBytes = (value: unknown, length?: number): value is number[] => Array.isArray(value)
  && (length === undefined || value.length === length) && value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)
const hex = (value: number[]) => `0x${value.map(byte => byte.toString(16).padStart(2, '0')).join('')}`
const integer = (value: unknown) => typeof value === 'bigint' ? (value >= 0n ? value : null)
  : typeof value === 'string' && /^\d+$/.test(value) ? BigInt(value)
  : typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null
const dusk = (value: unknown) => {
  const amount = integer(value)
  return amount === null ? '' : formatLuxNumberAsDusk(amount)
}
const years = (count: number | bigint) => `${count} ${pluralize(Number(count), 'year')}`

export function defaultPartyLabel(party: ActivityParty) {
  if (party.kind === 'market') return 'the market'
  if (party.kind === 'address') return short(party.address)
  if (party.kind === 'contract') return `contract ${short(party.contract)}`
  return `Account ID ${short(party.authority)}`
}

function short(value: string) {
  return value.length <= 18 ? value : `${value.slice(0, 10)}...${value.slice(-6)}`
}

function principalParty(value: unknown): ActivityParty | null {
  if (!isRow(value)) return null
  if (value.kind === 'Moonlight' && isBytes(value.bytes, 96)) return { kind: 'address', address: encodeBase58(value.bytes) }
  if (value.kind === 'Contract' && isBytes(value.bytes, 32)) return { kind: 'contract', contract: hex(value.bytes) }
  return null
}

// A payment made by the market contract reads as the market.
function payerParty(value: unknown, context: ActivityContext): ActivityParty | null {
  const party = principalParty(value)
  return party?.kind === 'contract' && authorityParty(party.contract, context)?.kind === 'market' ? { kind: 'market' } : party
}

function authorityParty(value: unknown, context: ActivityContext): ActivityParty | null {
  const id = isBytes(value, 32) ? hex(value) : typeof value === 'string' && /^0x[0-9a-f]{64}$/i.test(value) ? value.toLowerCase() : null
  if (!id) return null
  if (context.marketplaceContractId && id === context.marketplaceContractId.toLowerCase().replace(/^(?!0x)/, '0x')) return { kind: 'market' }
  return { kind: 'authority', authority: id }
}

function sameParty(left: unknown, right: unknown) {
  return isBytes(left) && isBytes(right) && hex(left) === hex(right)
}

function snapshotOf(entry: ActivityEntry): RecordSnapshot | null {
  const records = field(entry.data, 'snapshot', 'records')
  if (!Array.isArray(records)) return null
  return records.flatMap(record => isRow(record) && typeof record.key === 'string' && isBytes(record.value)
    ? [{ key: record.key, value: hex(record.value), updatedAt: String(record.updated_at ?? '') }] : [])
}

/** The transaction an event belongs to, on the name it was filed under. */
export function actionKey(entry: Pick<ActivityEntry, 'id' | 'node' | 'txId'>) {
  return entry.txId ? `${entry.node}:${entry.txId}` : entry.id
}

function authorityHex(value: unknown) {
  return isBytes(value, 32) ? hex(value) : typeof value === 'string' && /^(0x)?[0-9a-f]{64}$/i.test(value.trim()) ? value.trim().toLowerCase().replace(/^(?!0x)/, '0x') : null
}

function holdersOf(owner: unknown, manager: unknown): Holders | undefined {
  const pair = { owner: authorityHex(owner), manager: authorityHex(manager) }
  return pair.owner && pair.manager ? pair as Holders : undefined
}

type HolderChange = { key: string; height: number; before: Holders | undefined; after: Holders | undefined }

const holderTopics = new Set(['root_registered', 'subname_created', 'authorities_changed'])

/** A root's counters after one change: each change to a name tree raises its root's revision by one. */
function countersOf(entry: ActivityEntry) {
  const root = field(entry.data, 'root')
  const revision = integer(field(entry.data, 'counters', 'revision')), serial = integer(field(entry.data, 'counters', 'next_serial'))
  return entry.eventType === 'root_counters_changed' && isBytes(root) && revision !== null && serial !== null ? { root: hex(root), revision, serial } : null
}

/**
 * What the loaded rows say beyond each transaction's own events. The indexer orders rows by block,
 * and transactions in one block may arrive in either order, so nothing here depends on that order:
 * record sets are found by their digest, a root's counters by revision, and holders by block.
 */
export function priorState(entries: readonly ActivityEntry[], current?: Holders | null) {
  // A slot pointer carries the digest of the record set it points at, the same one the resolver reports for that set.
  const snapshots = new Map<string, RecordSnapshot>()
  const serials = new Map<string, bigint>()
  const changes: HolderChange[] = []
  for (const entry of entries) {
    const digest = field(entry.data, 'snapshot', 'digest'), records = entry.eventType === 'resolver_slot_written' ? snapshotOf(entry) : null
    if (records && isBytes(digest)) snapshots.set(hex(digest), records)
    const counters = countersOf(entry)
    if (counters) serials.set(`${counters.root}:${counters.revision}`, counters.serial)
    if (holderTopics.has(entry.eventType) && entry.blockHeight != null) changes.push({
      key: actionKey(entry), height: entry.blockHeight,
      // A registration or creation starts a new incarnation; who held an older one doesn't carry over.
      before: entry.eventType === 'authorities_changed' ? holdersOf(field(entry.data, 'previous_owner'), field(entry.data, 'previous_manager')) : undefined,
      after: holdersOf(field(entry.data, 'name', 'owner'), field(entry.data, 'name', 'manager')),
    })
  }
  return { snapshots, serials, changes, current: current ? holdersOf(current.owner, current.manager) : undefined }
}

type Prior = ReturnType<typeof priorState>

type RecordChanges = { set: string[]; removed: string[]; removedUnknown: boolean; cleared: boolean; moved: boolean; staged?: boolean }

function recordChanges(events: ActivityEntry[], prior: Prior): RecordChanges | null {
  const written = events.find(event => event.eventType === 'resolver_slot_written')
  const slot = events.find(event => event.eventType === 'slot_changed')
  const reason = field(slot?.data, 'reason')
  // Moving records copies them unchanged to a newer resolver.
  if (slot && reason === 'Move') return { set: [], removed: [], removedUnknown: false, cleared: false, moved: true }
  // Every change to a name's records moves its pointer. Staging a move to another registry writes
  // the records there without one, and anyone may do that.
  if (written && !slot) return { set: [], removed: [], removedUnknown: false, cleared: false, moved: false, staged: true }
  // Replacing every record with none writes no slot; the name's pointer is cleared.
  const current = written ? snapshotOf(written) : slot && field(slot.data, 'current') === null ? [] : null
  if (!current) return null
  const cleared = current.length === 0
  // The pointer before the change names the record set it replaced, whichever slot held it.
  const left = field(slot?.data, 'previous'), digest = field(left, 'digest')
  const previous = left === null ? [] : isBytes(digest) ? prior.snapshots.get(hex(digest)) : undefined
  if (previous) {
    const before = new Map(previous.map(record => [record.key, record.value]))
    const now = new Set(current.map(record => record.key))
    return {
      set: current.filter(record => before.get(record.key) !== record.value).map(record => record.key),
      removed: previous.filter(record => !now.has(record.key)).map(record => record.key),
      removedUnknown: false, cleared, moved: false,
    }
  }
  // Without the previous record set, a record stamped at this height was written in this block. An
  // earlier write in the block, once loaded, supplies that set.
  const height = written?.blockHeight == null ? '' : String(written.blockHeight)
  const set = current.filter(record => record.updatedAt === height).map(record => record.key)
  const before = integer(field(slot?.data, 'previous', 'count'))
  return { set, removed: [], removedUnknown: before !== null && Number(before) > current.length - set.length, cleared, moved: false }
}

function recordSentence(changes: RecordChanges, verb = 'updated') {
  const labels = (keys: string[]) => keys.map(recordLabel).join(', ')
  const { set, removed } = changes
  if (changes.moved) return 'Records moved to new storage'
  if (changes.staged) return 'Records copied for a move to another registry'
  if (set.length && removed.length) return `Records ${verb}: ${labels(set)}; removed: ${labels(removed)}`
  if (set.length) return `${set.length === 1 ? 'Record' : 'Records'} ${verb}: ${labels(set)}`
  if (removed.length) return `${removed.length === 1 ? 'Record' : 'Records'} removed: ${labels(removed)}`
  if (changes.cleared) return 'All records removed'
  return changes.removedUnknown ? 'Records removed' : 'Records updated'
}

// Who held the name while a transaction ran: as the last change in an earlier block left it, and as
// the first change in a later block (or the name's current holders) found it.
function holdersDuring(events: ActivityEntry[], prior: Prior): Holders | undefined {
  const key = actionKey(events[0]), height = events[0].blockHeight
  if (height == null) return undefined
  const others = prior.changes.filter(change => change.key !== key)
  // Rows don't order transactions in one block, so another change there leaves the holders unknown.
  if (others.some(change => change.height === height)) return undefined
  const nearest = (changes: HolderChange[], pick: (...heights: number[]) => number) => {
    if (!changes.length) return null
    const at = pick(...changes.map(change => change.height))
    const block = changes.filter(change => change.height === at)
    return block.every(change => change.key === block[0].key) ? block : undefined
  }
  // Within a transaction, rows run newest first.
  const earlier = nearest(others.filter(change => change.height < height), Math.max)
  const later = nearest(others.filter(change => change.height > height), Math.min)
  const before = earlier ? earlier[0].after : undefined
  const after = later === null ? prior.current : later ? later[later.length - 1].before : undefined
  if (before && after && (before.owner !== after.owner || before.manager !== after.manager)) return undefined
  return before ?? after
}

// Only a name's owner or manager can write its records. When both are one authority, it made the change.
function soleHolder(events: ActivityEntry[], context: ActivityContext, prior: Prior): ActivityParty | null {
  const holders = holdersDuring(events, prior)
  return holders && holders.owner === holders.manager ? authorityParty(holders.owner, context) : null
}

function registrationYears(event: ActivityEntry) {
  const expiry = integer(field(event.data, 'name', 'expires_at'))
  if (expiry === null || event.blockHeight === null) return null
  const blocks = expiry - BigInt(event.blockHeight)
  return blocks > 0n && blocks % YEAR_BLOCKS === 0n ? blocks / YEAR_BLOCKS : null
}

function orderOf(event: ActivityEntry | undefined) {
  const order = field(event?.data, 'order')
  return isRow(order) ? order : null
}

function marketTitle(events: ActivityEntry[], context: ActivityContext, label: (party: ActivityParty) => string): DescribedAction | null {
  const find = (topic: string) => events.find(event => event.eventType === topic)
  const settled = find('trade_settled'), changed = find('order_changed'), closed = find('order_closed')
  const order = orderOf(settled ?? changed ?? closed)
  if (!order) return null
  const kind = field(order, 'terms', 'kind'), price = dusk(field(order, 'terms', 'amount_lux'))
  if (settled) {
    const buyer = principalParty(field(settled.data, 'payer')) ?? authorityParty(field(settled.data, 'buyer'), context)
    const amount = dusk(field(settled.data, 'gross_lux')) || price
    const to = buyer ? ` to ${label(buyer)}` : ''
    const title = kind === 'Offer' ? `Offer accepted: sold${to} for ${amount}` : kind === 'Auction' ? `Sold at auction${to} for ${amount}` : `Sold${to} for ${amount}`
    const fee = integer(field(settled.data, 'fee_lux'))
    const details = [
      ...(fee ? [`Market fee: ${dusk(fee)}`] : []),
      ...(find('identity_cleared') || field(find('authorities_changed')?.data, 'data_cleared') === true ? ['Records and primary name cleared'] : []),
    ]
    // The seller accepts an offer; anyone may finish an auction once it ends.
    const actor = kind === 'Offer' ? sellerParty(order, context) : kind === 'Auction' ? null : buyer
    return { title, details, actor }
  }
  const seller = sellerParty(order, context)
  if (closed) {
    const reason = field(closed.data, 'reason')
    const offer = kind === 'Offer' ? `Offer of ${price}` : null
    if (reason === 'Returned') return { title: 'Returned from the market', details: [], actor: seller }
    if (reason === 'Sold') return { title: offer ? `${offer} accepted` : 'Sold', details: [], actor: null }
    if (reason === 'Expired') return { title: offer ? `${offer} expired` : kind === 'Auction' ? 'Auction closed after it expired' : 'Listing expired', details: [], actor: null }
    if (reason === 'LostCustody') return { title: kind === 'Offer' ? `${offer} closed` : 'Listing closed', details: ['The name was no longer held by the market'], actor: null }
    return {
      title: offer ? `${offer} cancelled` : kind === 'Auction' ? 'Auction cancelled' : 'Listing cancelled',
      details: [],
      actor: offer ? principalParty(field(order, 'payer')) ?? authorityParty(field(order, 'terms', 'buyer'), context) : seller,
    }
  }
  if (kind === 'Offer') {
    const buyer = principalParty(field(order, 'payer')) ?? authorityParty(field(order, 'terms', 'buyer'), context)
    return { title: `Offer of ${price}`, details: [], actor: buyer }
  }
  const highest = field(order, 'highest')
  if (kind === 'Auction' && isRow(highest) && !find('custody_started')) {
    const bidder = principalParty(highest.payer) ?? authorityParty(highest.manager, context)
    return { title: `Bid of ${dusk(highest.amount_lux)}`, details: [], actor: bidder }
  }
  const buyer = field(order, 'terms', 'buyer')
  const privateBuyer = isBytes(buyer) ? authorityParty(buyer, context) : null
  return {
    title: kind === 'Auction' ? `Auction started · minimum bid ${price}` : `Listed for ${price}`,
    details: privateBuyer ? [`Only ${label(privateBuyer)} can buy it`] : [],
    actor: seller,
  }
}

// A Moonlight seller's payout account is the account whose authority listed the name.
function sellerParty(order: Row, context: ActivityContext): ActivityParty | null {
  const seller = authorityParty(field(order, 'terms', 'seller'), context)
  const recipient = principalParty({ kind: 'Moonlight', bytes: field(order, 'terms', 'seller_recipient') })
  return seller?.kind === 'authority' && recipient?.kind === 'address' && sameAuthority(recipient.address, seller.authority) ? recipient : seller
}

function authorityTitle(event: ActivityEntry, context: ActivityContext, label: (party: ActivityParty) => string): DescribedAction {
  const data = event.data
  const reason = field(data, 'reason')
  const actor = authorityParty(field(data, 'actor'), context)
  const owner = authorityParty(field(data, 'name', 'owner'), context)
  const manager = authorityParty(field(data, 'name', 'manager'), context)
  const cleared = field(data, 'data_cleared') === true ? ['Records and primary name cleared'] : []
  if (reason === 'TakeBack') return { title: actor ? `Taken back by ${label(actor)}` : 'Taken back', details: cleared, actor }
  const ownerChanged = !sameParty(field(data, 'name', 'owner'), field(data, 'previous_owner'))
  const managerChanged = !sameParty(field(data, 'name', 'manager'), field(data, 'previous_manager'))
  const managerNote = managerChanged && manager && !sameParty(field(data, 'name', 'manager'), field(data, 'name', 'owner')) ? [`Manager: ${label(manager)}`] : []
  if (reason === 'Ancestor') return { title: owner ? `Reassigned to ${label(owner)}` : 'Reassigned', details: [...managerNote, ...cleared], actor }
  if (ownerChanged) return { title: owner ? `Transferred to ${label(owner)}` : 'Transferred', details: [...managerNote, ...cleared], actor }
  if (managerChanged) return { title: manager ? `Manager changed to ${label(manager)}` : 'Manager changed', details: cleared, actor }
  // Neither holder changed: what changed, if anything, is the cleared data.
  return cleared.length ? { title: cleared[0], details: [], actor } : { title: 'Owner and manager confirmed', details: [], actor }
}

const named = (action: RelatedAction) => action.title.includes(action.name) ? action.title : `${action.name}: ${action.title}`

function subnameParentTitle(events: ActivityEntry[], context: ActivityContext, prior: Prior): DescribedAction {
  // The subnames' own events name the action and who took it. One transaction has one caller, so the
  // actor of any part is the transaction's. One take-back can change up to 256 subnames while the root's
  // revision rises once, so a count or a single subname is given only when every subname that could
  // have changed was read back to this transaction, and none can have left the namespace since: the
  // subnames read are today's, and a removed one isn't among them.
  const txId = events.find(event => event.txId)?.txId
  const related = txId ? context.related?.get(txId) : undefined
  if (related?.length) {
    const height = events[0].blockHeight
    const activity = context.subnameActivity
    const at = Date.parse(events[0].timestamp)
    const since = activity?.since
    const inWindow = since === undefined || since === -Infinity || (Number.isFinite(at) && at >= since)
    const removedSince = (context.removals ?? []).some(removal => (removal.txId !== txId || removal.removedOthers)
      && (removal.blockHeight == null || height == null || removal.blockHeight >= height))
    const covered = Boolean(activity?.complete) && inWindow && height != null && !removedSince && (activity?.feeds ?? [])
      .every(feed => !feed.partial || feed.entries.some(entry => entry.blockHeight != null && entry.blockHeight < height))
    const actors = new Set(related.map(action => JSON.stringify(action.actor)))
    const actor = actors.size === 1 ? related[0].actor : null
    if (!covered) return { title: 'Subnames changed', details: [`Including ${related.map(named).join('; ')}`], actor }
    if (related.length === 1) return { title: named(related[0]), details: related[0].details, actor: related[0].actor }
    return { title: `${related.length} subnames changed`, details: related.map(named), actor }
  }
  // One transaction can change a root's counters more than once, one revision at a time.
  const changes = events.flatMap(event => countersOf(event) ?? []).sort((left, right) => left.revision < right.revision ? -1 : 1)
  const first = changes[0], last = changes[changes.length - 1]
  const serial = last?.serial ?? null
  const before = first && first.root === last.root ? prior.serials.get(`${first.root}:${first.revision - 1n}`) : undefined
  // Every new subname takes the root's next serial; other subname changes leave it alone. Without
  // the counters before this transaction, a creation can't be told apart from another change.
  if (serial === null || before === undefined || serial <= before) return { title: 'Subname changed', details: [], actor: null }
  // This transaction took the serials from the previous next serial up to its own.
  const created = (context.subnames ?? []).filter(subname => {
    const taken = integer(subname.serial)
    return taken !== null && taken >= before && taken < serial
  })
  if (serial - before === 1n) return { title: created.length === 1 ? `Subname ${created[0].name} created` : 'Subname created', details: [], actor: null }
  return { title: 'Subnames created', details: created.length ? [created.map(subname => subname.name).join(', ')] : [], actor: null }
}

const moveTitles: Record<string, string> = {
  move_started: 'Move to another registry started',
  move_cancelled: 'Move to another registry cancelled',
  root_forwarded: 'Moved to another registry',
  root_imported: 'Moved here from another registry',
  root_ceded: 'Previous registration retired',
}

/** One action per transaction: the event a person caused, with the rest folded into its details. */
export function describeFrozenAction(events: ActivityEntry[], context: ActivityContext, prior: Prior): DescribedAction | null {
  const label = context.label ?? defaultPartyLabel
  const find = (topic: string) => events.find(event => event.eventType === topic)
  const delegate = events.find(event => event.via)
  const viaDetail = delegate?.via ? [`Through contract ${short(delegate.via)}`] : []
  const delegated = delegate ? principalParty(delegate.principal) : null
  const result = describe()
  return result && { ...result, details: [...result.details, ...viaDetail], actor: delegated ?? result.actor }

  function describe(): DescribedAction | null {
    const registered = find('root_registered')
    if (registered) {
      const data = registered.data
      const count = registrationYears(registered)
      const term = count === null ? '' : ` for ${years(count)}`
      const fee = integer(field(data, 'fee_lux')) ?? 0n
      const premium = integer(field(data, 'premium_lux')) ?? 0n
      const reason = field(data, 'reason')
      const title = reason === 'Reserved' ? `Issued as a reserved name${term}`
        : fee > 0n ? `Registered${term} · ${dusk(fee)}` : `Registered${term} · no fee`
      const records = recordChanges(events, prior)
      const primary = find('primary_changed')
      const details = [
        ...(premium > 0n ? [`Includes a ${dusk(premium)} premium`] : []),
        ...(records?.set.length ? [recordSentence(records, 'set')] : []),
        ...(primary && field(primary.data, 'reason') === 'Set' ? ['Set as primary name'] : []),
        ...(find('subtree_removed') || find('identity_cleared') ? ['Records and subnames of the previous registration cleared'] : []),
      ]
      return { title, details, actor: principalParty(field(data, 'payer')) }
    }
    // A renewal paid from a listing is made by the market; its own event names who paid.
    const renewed = find('root_renewed'), escrow = find('escrow_renewed')
    if (renewed || escrow) {
      const data = renewed?.data
      const count = integer(field(data, 'years')) ?? integer(field(escrow?.data, 'renewal', 'years'))
      const expiry = integer(field(data, 'expires_at'))
      const term = count === null ? '' : years(count)
      const fee = dusk(field(data, 'fee_lux') ?? field(escrow?.data, 'renewal', 'expected_fee_lux'))
      const date = expiry !== null && expiry <= BigInt(Number.MAX_SAFE_INTEGER) && context.currentBlockHeight != null && context.nowSeconds !== undefined
        ? formatLifecycleDay(Number(expiry), context.currentBlockHeight, context.nowSeconds) : null
      const title = date ? [`Renewed to ${date}`, term, fee].filter(Boolean).join(' · ') : `Renewed${term ? ` for ${term}` : ''}${fee ? ` · ${fee}` : ''}`
      return { title, details: [], actor: principalParty(field(escrow?.data, 'payer')) ?? payerParty(field(data, 'payer'), context) }
    }
    // A renewal paid while the name is listed stays a renewal; market events otherwise name the action.
    const market = marketTitle(events, context, label)
    if (market) return market
    const created = find('subname_created')
    if (created) {
      const actor = authorityParty(field(created.data, 'actor'), context)
      const owner = field(created.data, 'name', 'owner'), manager = field(created.data, 'name', 'manager')
      // Given away only when someone else owns it; a creator who stays its owner can still name a manager.
      const given = sameParty(owner, field(created.data, 'actor')) ? null : authorityParty(owner, context)
      const managedBy = sameParty(manager, owner) ? null : authorityParty(manager, context)
      const what = given ? ` and given to ${label(given)}` : managedBy ? `, managed by ${label(managedBy)}` : ''
      const details = given && managedBy ? [`Manager: ${label(managedBy)}`] : []
      if (context.subject) return { title: `Subname ${context.subject} created${what}`, details, actor }
      return { title: what ? `Created${what}` : 'Subname created', details, actor }
    }
    const removed = find('subtree_removed')
    if (removed) {
      const data = removed.data
      const count = Number(integer(field(data, 'removed_count')) ?? 0n)
      const reason = field(data, 'reason')
      const title = reason === 'Pruned' ? 'Expired subname removed' : reason === 'Recreated' ? 'Subname created again'
        : reason === 'Reregistered' ? 'Previous subnames removed' : field(data, 'include_target') === false ? 'Subnames removed' : 'Subname removed'
      return { title, details: count > 1 ? [`${count} names removed`] : [], actor: authorityParty(field(data, 'actor'), context) }
    }
    const authorities = find('authorities_changed')
    if (authorities) return authorityTitle(authorities, context, label)
    const records = recordChanges(events, prior)
    if (records) return { title: recordSentence(records), details: [], actor: records.staged ? null : soleHolder(events, context, prior) }
    const primary = find('primary_changed')
    if (primary) {
      const reason = field(primary.data, 'reason')
      const endpoint = isBytes(field(primary.data, 'endpoint'), 96) ? principalParty({ kind: 'Moonlight', bytes: field(primary.data, 'endpoint') }) : null
      if (reason === 'Set') return { title: 'Primary name set', details: [], actor: endpoint }
      return { title: 'Primary name cleared', details: reason === 'IdentityClear' ? ['Its records were cleared'] : [], actor: reason === 'Clear' ? endpoint : null }
    }
    const move = events.find(event => moveTitles[event.eventType])
    if (move) return { title: moveTitles[move.eventType], details: [], actor: null }
    if (events.some(event => event.eventType === 'root_counters_changed')) return subnameParentTitle(events, context, prior)
    if (events.some(event => event.eventType === 'resolver_slot_pruned' || event.eventType.endsWith('_rows_pruned'))) {
      return { title: 'Old record storage cleared', details: [], actor: null }
    }
    const visible = events.find(event => !bookkeeping.has(event.eventType))
    return visible ? { title: humanize(visible.eventType), details: [], actor: null } : null
  }
}

function humanize(topic: string) {
  const words = topic.replaceAll('_', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Frozen rows carry their canonical body; entries the app adds itself use the older labels. */
export function isFrozenEntry(entry: ActivityEntry) {
  return entry.data !== undefined && entry.data !== null
}
