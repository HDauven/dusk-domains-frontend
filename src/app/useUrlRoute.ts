import { useEffect, useRef } from 'react'
import type { AppMainView } from './AppTypes'
import { parseRoute, routePath, type AppRoute } from './routes'

// Keeps the address bar and the app in step: every view and every searched name has a URL,
// the back button works, and a refresh or a shared link opens the same place.
export function useUrlRoute({ checked, mainView, onOpenName, onOpenView, searchedName }: {
  checked: boolean
  mainView: AppMainView
  onOpenName: (name: string) => void
  onOpenView: (view: AppMainView) => void
  searchedName: string | null
}) {
  // The route taken from the address bar that the app is still catching up to. It is fresh until
  // the app has rendered once after applying it, since that render still shows the old state.
  const pending = useRef<{ route: AppRoute, fresh: boolean } | null>(null)
  const open = useRef({ onOpenName, onOpenView })
  useEffect(() => {
    open.current = { onOpenName, onOpenView }
  })

  useEffect(() => {
    const apply = () => {
      const route = parseRoute(window.location.pathname)
      pending.current = { route, fresh: true }
      if (route.name) open.current.onOpenName(route.name)
      else open.current.onOpenView(route.view)
    }
    apply()
    window.addEventListener('popstate', apply)
    return () => window.removeEventListener('popstate', apply)
  }, [])

  const current: AppRoute = mainView === 'search' && checked && searchedName
    ? { view: 'search', name: searchedName }
    : { view: mainView }
  const path = routePath(current)

  useEffect(() => {
    if (window.location.pathname === path) {
      pending.current = null
      return
    }
    if (pending.current?.fresh) {
      pending.current.fresh = false
      return
    }
    const target = pending.current?.route
    if (target) {
      // A shortened name link (/name/pie) settles on its canonical address.
      if (target.name && current.name === target.name) {
        pending.current = null
        window.history.replaceState(null, '', `${path}${window.location.search}`)
        return
      }
      const catchingUp = target.name
        ? current.view === 'search' && !current.name
        : current.view === target.view
      if (catchingUp) return
      pending.current = null
    }
    window.history.pushState(null, '', `${path}${window.location.search}`)
    // current is derived from the same inputs as path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])
}
