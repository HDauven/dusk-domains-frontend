import * as sdk from '@duskdomains/sdk'
import { admittedStores, storeOwnRead } from './directoryMembers'

/** A Dusk address's stored primary link in one store. */
export type PrimaryLink = { store: string; view: sdk.PrimaryView }

/**
 * Every store's stored primary link for a Dusk address, read at one height. These are the links
 * set_primary's uniqueness check reads: stored, whether or not the name still resolves. A store sets
 * a primary only while no other store holds a link for the address; its own link it replaces.
 */
export async function primaryLinks(client: sdk.FrozenClient, endpoint: number[]): Promise<PrimaryLink[]> {
  return client.snapshot(() => linksNow(client, endpoint))
}

// The links at the height of the snapshot this runs in.
async function linksNow(client: sdk.FrozenClient, endpoint: number[]): Promise<PrimaryLink[]> {
  return (await Promise.all((await admittedStores(client)).map(async (admission) => {
    const store = sdk.contractId(admission.id)
    const view = await client.store(store).read_primary({ endpoint })
    return view ? { store, view } : null
  }))).filter((link): link is PrimaryLink => link !== null)
}

/** Why set_primary would refuse a name now, in the words the page shows. Nothing is sent. */
export class PrimaryTargetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PrimaryTargetError'
  }
}

/** A name set_primary would set for an address now: the store it lives in, its incarnation, and the address's links. */
export type PrimaryTarget = { store: string; ref: sdk.NameRef; links: PrimaryLink[] }

const shortAddress = (address: string) => address.length <= 18 ? address : `${address.slice(0, 10)}...${address.slice(-6)}`

/**
 * Every set_primary precondition but its uniqueness check, read at one height. set_primary takes a
 * direct transaction from the Dusk address it sets, `sender`, signed by the name's owner or manager,
 * for a name that hasn't expired and isn't being moved, whose Dusk address record is that address.
 * The links it returns show whether another store keeps a link for the address.
 */
export async function primaryTarget(client: sdk.FrozenClient, spelling: string, sender: number[]): Promise<PrimaryTarget> {
  return client.snapshot(async () => {
    // The name at its home, where its root is Local, and its Dusk address record there.
    const [resolved, links] = await Promise.all([client.resolve(spelling, ['moonlight_address']), linksNow(client, sender)])
    const view = typeof resolved.value === 'object' && 'Local' in resolved.value ? resolved.value.Local : null
    if (!view) throw new PrimaryTargetError(`${spelling} isn’t registered right now, so it can’t be a primary name.`)
    const store = sdk.contractId(resolved.store), key = view.name.key
    // A link the address keeps in this store is replaced, which its own move would hold up too.
    const own = links.find(link => link.store === store)
    if (view.move_pending || (own && await primaryLinkMoving(client, own)))
      throw new PrimaryTargetError(`${spelling} is moving between shards, so it can’t be set as a primary name until the move finishes.`)
    if (!view.active) throw new PrimaryTargetError(`${spelling} has expired, so it can’t be a primary name. Renew it first.`)
    const forward = resolved.records[0]
    if (!forward)
      throw new PrimaryTargetError(`${spelling} has no Dusk address record, so it can’t be a primary name. Add your Dusk address under Records first.`)
    if (sdk.hex(forward.value) !== sdk.hex(sender))
      throw new PrimaryTargetError(`${spelling} points to another Dusk address, ${shortAddress(sdk.encodeBase58(Uint8Array.from(forward.value)))}. Only that address’s wallet can make ${spelling} its primary name.`)
    const signer = sdk.hex(sdk.authority({ kind: 'Moonlight', bytes: sender }))
    if (![view.name.owner, view.name.manager].some(authority => sdk.hex(authority) === signer))
      throw new PrimaryTargetError(`Only the owner or manager of ${spelling} can make it a primary name.`)
    return { store, ref: { key, incarnation: view.name.incarnation }, links }
  })
}

/**
 * Whether a link can't be cleared now. clear_primary refuses while the link's name is being moved out
 * of its store (MovePending); a move still in its window is refused here too. A store reports no link
 * for a name that moved away or is still staged, so those are refused here only as a guard.
 */
export async function primaryLinkMoving(client: sdk.FrozenClient, link: PrimaryLink) {
  const key = link.view.primary.name.key
  const [home, name] = await Promise.all([
    storeOwnRead(client, link.store, 'home', { root: key.root }),
    storeOwnRead(client, link.store, 'get_name', key),
  ])
  const view = typeof name === 'object' && 'Local' in name ? name.Local : null
  return home !== 'Local' || Boolean(view?.move_pending)
}

/**
 * A primary name set_primary would refuse to set: the Dusk address's primary link is in another
 * store, which only the address can clear first. `current` is the name that link is to.
 */
export class PrimaryElsewhereError extends Error {
  readonly current: string
  readonly store: string
  readonly mappingId: string
  readonly target: string
  constructor(link: PrimaryLink, target: string) {
    super(`${link.view.spelling} is your primary name, kept in a different shard from ${target}. Clear it first, then set ${target}.`)
    this.name = 'PrimaryElsewhereError'
    this.current = link.view.spelling
    this.store = link.store
    this.mappingId = String(link.view.primary.mapping_id)
    this.target = target
  }
}

/** The primary name a failed write was refused for because another store holds the link, if any. */
export function primaryElsewhere(error: unknown): { current: string; store: string; mappingId: string; target: string } | null {
  if (!(error instanceof Error) || error.name !== 'PrimaryElsewhereError') return null
  const { current, store, mappingId, target } = error as Partial<PrimaryElsewhereError>
  return typeof current === 'string' && typeof store === 'string' && typeof mappingId === 'string' && typeof target === 'string'
    ? { current, store, mappingId, target } : null
}
