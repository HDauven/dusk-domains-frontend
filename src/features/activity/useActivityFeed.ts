import { appendPage } from '../marketplace/marketplacePages'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createActivityEntry,
  createRecentChangeWarnings,
  type ActivityEntry,
  type DuskDomainsIndexerClient,
  userFacingErrorMessage,
} from '../../names/internal'

type AppendActivityInput = {
  eventType: ActivityEntry['eventType']
  actor: string
  target?: string
  txId?: string
  node?: string
  name?: string
}

export function useActivityFeed({
  defaultName,
  defaultNode,
  indexerClient,
  setError,
}: {
  indexerClient: DuskDomainsIndexerClient | null
  setError: (message: string) => void
  defaultName: string
  defaultNode: string
}) {
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityCursor, updateCursor] = useState<{ node: string; cursor: string | null } | null>(null)
  const generation = useRef(0)
  const pending = useRef(false)
  const activeNode = useRef(defaultNode)
  const setActivityCursor = useCallback((page: { node: string; cursor: string | null } | null) => {
    generation.current += 1
    pending.current = false
    updateCursor(page)
  }, [])
  const beginActivityRead = useCallback((node: string) => {
    activeNode.current = node
    const currentGeneration = ++generation.current
    pending.current = false
    updateCursor(null)
    return () => generation.current === currentGeneration
  }, [])
  useEffect(() => {
    if (activeNode.current !== defaultNode) {
      activeNode.current = defaultNode
      generation.current += 1
      pending.current = false
    }
  }, [defaultNode])
  useEffect(() => () => { generation.current += 1; pending.current = false }, [indexerClient])
  const hasMoreActivity = activityCursor?.node === defaultNode && Boolean(activityCursor.cursor)
  const loadMoreActivity = useCallback(async () => {
    if (!indexerClient || activityCursor?.node !== defaultNode || !activityCursor.cursor || pending.current) return
    const currentGeneration = generation.current
    pending.current = true
    setActivityLoading(true)
    try {
      const page = await indexerClient.getActivityPage(defaultNode, { cursor: activityCursor.cursor })
      if (generation.current !== currentGeneration) return
      setActivityEntries((current) => appendPage(current, page.activity, (entry) => entry.id))
      updateCursor({ node: defaultNode, cursor: page.nextCursor })
    } catch (error) {
      if (generation.current === currentGeneration) setError(userFacingErrorMessage(error))
    } finally {
      if (generation.current === currentGeneration) {
        pending.current = false
        setActivityLoading(false)
      }
    }
  }, [activityCursor, defaultNode, indexerClient, setError])
  const recentWarnings = useMemo(() => createRecentChangeWarnings(activityEntries), [activityEntries])

  const appendActivity = useCallback((input: AppendActivityInput) => {
    const node = input.node ?? defaultNode
    const name = input.name ?? defaultName
    if (!node) return

    const entry = createActivityEntry({
      eventType: input.eventType,
      node,
      name,
      actor: input.actor,
      target: input.target,
      txId: input.txId,
    })

    setActivityEntries((current) => [entry, ...current])
  }, [defaultName, defaultNode])

  return {
    searchActions: {
      beginRead: beginActivityRead,
      reset: () => { setActivityEntries([]); setActivityCursor(null); setActivityLoading(false) },
      startLoading: () => setActivityLoading(true),
      finishLoading: () => setActivityLoading(false),
      hydrate: (node: string, entries: ActivityEntry[], cursor: string | null) => {
        setActivityEntries(entries)
        setActivityCursor({ node, cursor })
      },
    },
    beginActivityRead,
    activityEntries,
    activityLoading,
    hasMoreActivity,
    loadMoreActivity,
    setActivityCursor,
    appendActivity,
    recentWarnings,
    setActivityEntries,
    setActivityLoading,
  }
}
