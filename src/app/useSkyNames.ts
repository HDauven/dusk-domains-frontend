import { useEffect, useState } from 'react'
import type { useAppRuntime } from './useAppRuntime'

export type ShowcaseName = {
  name: string
  node: string
  avatar: string | null
  primary: boolean
  activity: number
}

// Registered names light the sky and fill the home page's "Already on Dusk" row.
export function useSkyNames(indexerClient: ReturnType<typeof useAppRuntime>['indexerClient']) {
  const [names, setNames] = useState<ShowcaseName[]>([])

  useEffect(() => {
    if (!indexerClient) return
    let live = true
    indexerClient.getNames()
      .then((list) => {
        if (!live) return
        setNames(list
          .filter((entry) => entry.status === 'active')
          .map((entry) => ({
            name: entry.canonicalName,
            node: entry.node,
            avatar: entry.records.find((record) => record.key === 'avatar')?.value ?? null,
            primary: entry.primaryStatus === 'verified' && entry.primaryName === entry.canonicalName,
            activity: entry.activityCount,
          })))
      })
      .catch(() => { /* The sky is decoration; an unreachable indexer leaves it empty. */ })
    return () => { live = false }
  }, [indexerClient])

  return names
}

export function showcase(names: ShowcaseName[], count = 6) {
  // Short names read well as chips; long ones (often test or deploy names) stay in the sky.
  return names
    .filter((entry) => entry.name.length <= 18 && (entry.avatar || entry.primary))
    .sort((a, b) => Number(Boolean(b.avatar)) - Number(Boolean(a.avatar)) || Number(b.primary) - Number(a.primary) || b.activity - a.activity)
    .slice(0, count)
}
