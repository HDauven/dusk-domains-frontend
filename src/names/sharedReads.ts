import * as sdk from '@duskdomains/sdk'

// SDK 0.3.2 BRIDGE. Delete this file, its tests (sharedReads.test.ts, app/liveNodeReads.test.ts) and
// its uses in app/duskDomainsLiveApp.ts once the frontend moves to SDK 0.4.x, which shares these
// reads itself.
//
// SDK 0.3.2 reads the tip height before and after every public read, reads the directory's store
// members again inside every located read, and verifies every contract again on each page load, so
// one name page asks the node for the same reads many times. Given to the SDK as its transport, this
// answers those repeats without asking the node again, and answers no height from memory:
// - Every height read goes to the node. Calls made in the same turn share one request, sent after
//   the last of them asked, so each caller still gets a height read after it asked.
// - A contract read is shared within one tip generation, which lasts until a height reply differs
//   from the one before: identical reads on their way are sent once, and a reply is reused while the
//   tip is unchanged. A read sent before the tip changed is neither kept nor joined after the change.
//   A snapshot that used a shared reply still reads the height after it, so a reply from another
//   height fails the SDK's tip check exactly as a fresh one would.
// - Outside a snapshot no tip check follows a read, so nothing is shared before the first height
//   reply, nor once no height was read for five seconds.
// - A failed read is never kept: every caller waiting on it gets its error, and the next one asks again.
// - interface_version, binding and order_api_version never change for a deployed frozen contract
//   (constants, or set once at initialization), so their replies are kept at every height, and for the
//   tab's session through `immutable`. The SDK decodes and checks them as it does a fresh reply.

const IMMUTABLE = new Set(['interface_version', 'binding', 'order_api_version'])
const IDLE_MS = 5000
const PREFIX = 'dusk-domains:immutable-read:v1:'

/** Replies that never change, kept beyond one transport. */
export type ImmutableReads = { get(key: string): Uint8Array | undefined; set(key: string, reply: Uint8Array): void }
type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>
const session = (): SessionStorage | null | undefined => globalThis.sessionStorage

export function createSharedReadTransport(
  node: sdk.ReadTransport,
  { immutable, now = () => performance.now() }: { immutable?: ImmutableReads; now?: () => number } = {},
): sdk.ReadTransport {
  let tip: bigint | undefined,
    observedAt = -Infinity,
    // This generation's reads, on their way or answered, by contract, method and input.
    replies = new Map<string, Promise<Uint8Array>>(),
    // A height request not sent yet, which calls made in this turn share.
    height: Promise<bigint> | null = null
  const kept = new Map<string, Promise<Uint8Array>>()
  return {
    currentBlockHeight() {
      height ??= Promise.resolve()
        .then(() => {
          height = null
          return node.currentBlockHeight()
        })
        .then((value) => {
          if (value !== tip) {
            tip = value
            replies = new Map()
          }
          observedAt = now()
          return value
        })
      return height
    },
    async read(contract, method, bytes) {
      const key = `${contract}/${method}/${sdk.hex(bytes)}`
      if (IMMUTABLE.has(method)) {
        let reply = kept.get(key)
        if (!reply) {
          const stored = immutable?.get(key)
          const read = stored ? Promise.resolve(stored) : node.read(contract, method, bytes)
          kept.set(key, (reply = read))
          read.then(
            (value) => { if (!stored) immutable?.set(key, value) },
            () => { if (kept.get(key) === read) kept.delete(key) },
          )
        }
        return (await reply).slice()
      }
      if (tip === undefined || now() - observedAt > IDLE_MS) return node.read(contract, method, bytes)
      const generation = replies
      let reply = generation.get(key)
      if (!reply) {
        const read = node.read(contract, method, bytes)
        generation.set(key, (reply = read))
        read.catch(() => { if (generation.get(key) === read) generation.delete(key) })
      }
      return (await reply).slice()
    },
  }
}

/** Immutable replies kept in this tab's session storage for one release, named by its manifest's hash. */
export function sessionImmutableReads(release: unknown, storage: () => SessionStorage | null | undefined = session): ImmutableReads {
  let namespace: string
  try {
    // Plain JSON: a manifest keeps every field the deploy tool wrote, decimals too, which the
    // SDK's lossless JSON refuses to write.
    const json = JSON.stringify(release, (_, value: unknown) => (typeof value === 'bigint' ? `${value}n` : value))
    namespace = `${PREFIX}${sdk.hex(sdk.hash('dusk-domains/immutable-reads:', json))}:`
  } catch {
    // A release this can't name keeps nothing: every reply is read from the node, as without it.
    return { get: () => undefined, set: () => {} }
  }
  return {
    get(key) {
      try {
        const stored = storage()?.getItem(namespace + key)
        // Never more than a node reply may hold; anything else is read from the node again.
        return stored && stored.length <= 2 * 32768 && /^(?:[\da-f]{2})+$/.test(stored)
          ? Uint8Array.from(sdk.fromHex(stored))
          : undefined
      } catch {
        return undefined
      }
    },
    set(key, reply) {
      try {
        if (reply.length) storage()?.setItem(namespace + key, sdk.hex(reply))
      } catch {
        // Storage may be unavailable or full; the reply is read from the node next time.
      }
    },
  }
}

/** Forgets every kept immutable reply, as the app does when it discards a client. */
export function clearSessionImmutableReads(storage: () => SessionStorage | null | undefined = session) {
  try {
    const store = storage()
    if (!store) return
    for (let index = store.length - 1; index >= 0; index--) {
      const key = store.key(index)
      if (key?.startsWith(PREFIX)) store.removeItem(key)
    }
  } catch {
    // Storage may be unavailable; nothing was kept then.
  }
}
