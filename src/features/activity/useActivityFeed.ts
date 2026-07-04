import { useCallback, useMemo, useState } from 'react'
import {
  createActivityEntry,
  createRecentChangeWarnings,
  type ActivityEntry,
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
}: {
  defaultName: string
  defaultNode: string
}) {
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
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
    activityEntries,
    activityLoading,
    appendActivity,
    recentWarnings,
    setActivityEntries,
    setActivityLoading,
  }
}
