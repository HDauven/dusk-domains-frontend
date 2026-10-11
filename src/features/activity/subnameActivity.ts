import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import type { ActivityEntry, DuskDomainsIndexerClient } from '../../names/internal'
import { isSubnameTrace, type SubnameActivityFeed, type SubnameActivityFeeds } from './activityEvents'

export type SubnameFeed = SubnameActivityFeed
export type SubnameActivity = SubnameActivityFeeds

type SubnameSource = { name: string; node: string; owner: string; manager: string; updatedAt?: string | null }

const MAX_FULL_HISTORY = 1_000

// A subname transaction leaves only its root's counters on the parent (see isSubnameTrace), which can't
// say what changed or who did it.
function unexplained(entries: readonly ActivityEntry[]) {
  const transactions = new Map<string, ActivityEntry[]>()
  for (const entry of entries) {
    if (entry.txId && entry.data !== undefined && entry.data !== null) transactions.set(entry.txId, [...(transactions.get(entry.txId) ?? []), entry])
  }
  return [...transactions.entries()]
    .filter(([, events]) => isSubnameTrace(events))
    .map(([txId, events]) => ({ txId, at: Date.parse(events[0].timestamp) }))
}

/** Transactions on this name that only its subnames' activity can explain. */
export function unexplainedSubnameTransactions(entries: readonly ActivityEntry[]) {
  return unexplained(entries).map(transaction => transaction.txId)
}

/**
 * Reads the activity of the subnames that changed at or after the oldest such transaction, at most
 * `maxSubnames` of them, most recently changed first. A subname that fails to load is left out.
 * `complete` says every such subname was read, for the transactions from `since` on. These are today's
 * subnames, so activityActions counts a transaction's parts only if none can have left the namespace since.
 * `full` reads each subname's whole history, for the download.
 */
export async function loadSubnameActivity(client: DuskDomainsIndexerClient, entries: readonly ActivityEntry[], subnames: readonly SubnameSource[],
  { maxSubnames = 16, full = false }: { maxSubnames?: number; full?: boolean } = {}): Promise<SubnameActivity> {
  const transactions = unexplained(entries)
  if (!transactions.length || !subnames.length) return { feeds: [], complete: true }
  const times = transactions.map(transaction => transaction.at)
  // Indexer timestamps of one clock; an unreadable one means any subname may hold the answer.
  const since = times.every(Number.isFinite) ? Math.min(...times) : -Infinity
  const changedAt = (subname: SubnameSource) => subname.updatedAt ? Date.parse(subname.updatedAt) : NaN
  const changed = subnames
    .filter(subname => !Number.isFinite(changedAt(subname)) || changedAt(subname) >= since)
    .sort((left, right) => (Number.isFinite(changedAt(right)) ? changedAt(right) : -Infinity) - (Number.isFinite(changedAt(left)) ? changedAt(left) : -Infinity))
  const candidates = changed.slice(0, maxSubnames)
  const feeds = await Promise.all(candidates.map(async (subname): Promise<SubnameFeed | null> => {
    const holders = { owner: subname.owner, manager: subname.manager }
    try {
      if (full) return { name: subname.name, node: subname.node, holders, entries: await client.getAllActivity(subname.node, MAX_FULL_HISTORY), partial: false }
      const page = await client.getActivityPage(subname.node)
      return { name: subname.name, node: subname.node, holders, entries: page.activity, partial: Boolean(page.nextCursor) }
    } catch {
      return null
    }
  }))
  const read = feeds.filter((feed): feed is SubnameFeed => feed !== null)
  // Kept with the feeds: while a longer history is read again, its older rows aren't covered by them.
  return { feeds: read, complete: changed.length === candidates.length && read.length === candidates.length, since }
}

const none: SubnameActivity = { feeds: [], complete: true }

/** The subnames' activity behind this name's loaded activity, read again when either changes. */
export function useSubnameActivity(client: DuskDomainsIndexerClient | null, node: string, entries: readonly ActivityEntry[], subnames: readonly SubnameSource[]): SubnameActivity {
  const [loaded, setLoaded] = useState<{ key: string; node: string; activity: SubnameActivity }>({ key: '', node: '', activity: none })
  const key = useMemo(() => {
    const transactions = unexplainedSubnameTransactions(entries)
    if (!client || !node || !transactions.length || !subnames.length) return ''
    return [node, ...transactions, ...subnames.map(subname => [subname.node, subname.owner, subname.manager, subname.updatedAt ?? ''].join(':'))].join('|')
  }, [client, node, entries, subnames])
  const load = useEffectEvent(() => client ? loadSubnameActivity(client, entries, subnames) : Promise.resolve(none))
  useEffect(() => {
    if (!key) return
    let current = true
    void load().then(activity => { if (current) setLoaded({ key, node, activity }) })
    return () => { current = false }
  }, [key, node])
  if (!key) return none
  // While a newer page is read, the same name's earlier feeds still explain the rows they matched by transaction.
  return loaded.key === key || loaded.node === node ? loaded.activity : none
}
