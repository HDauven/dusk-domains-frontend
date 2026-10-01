import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { createSingleFlight, type RefreshOptions } from './singleFlight'

export function useSingleFlight<T>(read: (options?: RefreshOptions) => Promise<T>, scope: unknown = read) {
  const current = useRef(read)
  useLayoutEffect(() => { current.current = read }, [read])
  const run = useMemo(() => createSingleFlight<T>(), [])
  return useCallback((options?: RefreshOptions) => run(() => current.current(options), scope, options?.fresh), [run, scope])
}
