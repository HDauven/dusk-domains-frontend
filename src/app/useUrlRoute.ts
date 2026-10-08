import { useEffect, useRef } from 'react'
import type { AppMainView } from './AppTypes'
import { parseRoute, routePath, type AppRoute } from './routes'

// Keeps the address bar and the app in step: every view and every searched name has a URL,
// the back button works, and a refresh or a shared link opens the same place.
export function useUrlRoute({ checked, mainView, onOpenName, onOpenView, searchedName, selectedAuctionNode, onOpenAuction, sellName, onOpenSell, offerName, onOpenOffer }: {
  sellName?: string
  onOpenSell?: (name: string) => void
  offerName?: string
  onOpenOffer?: (name: string) => void
  selectedAuctionNode?: string
  onOpenAuction?: (node: string) => void
  checked: boolean
  mainView: AppMainView
  onOpenName: (name: string) => void
  onOpenView: (view: AppMainView) => void
  searchedName: string | null
}) {
  const current: AppRoute = mainView === 'search' && checked && searchedName
    ? { view: 'search', name: searchedName }
    : mainView === 'marketplace' && sellName ? { view: mainView, sellName }
    : mainView === 'marketplace' && offerName ? { view: mainView, offerName }
    : mainView === 'marketplace' && selectedAuctionNode ? { view: mainView, auctionNode: selectedAuctionNode } : { view: mainView }
  const path = routePath(current)

  // The route taken from the address bar that the app is still catching up to. It is fresh until
  // the app has rendered once after applying it, since that render still shows the old state.
  const pending = useRef<{ route: AppRoute, fresh: boolean } | null>(null)
  const open = useRef({ onOpenName, onOpenView, onOpenAuction, onOpenSell, onOpenOffer })
  const shown = useRef(path)
  useEffect(() => {
    open.current = { onOpenName, onOpenView, onOpenAuction, onOpenSell, onOpenOffer }
    shown.current = path
  })

  useEffect(() => {
    const apply = () => {
      const route = parseRoute(window.location.pathname)
      // The app can already show the route: it starts on the page its address names. Then only
      // the address is tidied (case, trailing slash), and nothing stays pending to hold back the
      // next navigation's history entry.
      if (routePath(route) === shown.current) {
        pending.current = null
        if (window.location.pathname !== shown.current) window.history.replaceState(null, '', `${shown.current}${window.location.search}`)
      } else {
        pending.current = { route, fresh: true }
      }
      if (route.name) open.current.onOpenName(route.name)
      else {
        open.current.onOpenView(route.view)
        if (route.sellName) open.current.onOpenSell?.(route.sellName)
        else if (route.offerName) open.current.onOpenOffer?.(route.offerName)
        else open.current.onOpenAuction?.(route.auctionNode ?? '')
      }
    }
    apply()
    window.addEventListener('popstate', apply)
    return () => window.removeEventListener('popstate', apply)
  }, [])

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
      // Once the parsed route is applied, normalize aliases and trailing slashes.
      if (routePath(target) === path) {
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
