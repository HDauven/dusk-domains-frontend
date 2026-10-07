import type { MouseEvent } from 'react'
import type { AppMainView } from './AppTypes'

export type AppRoute = { view: AppMainView, name?: string, auctionNode?: string, sellName?: string }

const viewPaths: Record<AppMainView, string> = {
  search: '/',
  'my-names': '/my',
  marketplace: '/market',
  referrals: '/referrals',
  treasury: '/treasury',
  terms: '/terms',
  privacy: '/privacy',
}

export function parseRoute(pathname: string): AppRoute {
  try {
    return parseDecodedRoute(pathname)
  } catch (error) {
    if (error instanceof URIError) return { view: 'search' }
    throw error
  }
}

function parseDecodedRoute(pathname: string): AppRoute {
  const path = pathname.replace(/\/+$/, '') || '/'
  const sell = /^\/market\/sell\/([^/]+)$/.exec(path)
  if (sell) return { view: 'marketplace', sellName: decodeURIComponent(sell[1]).toLowerCase() }
  const auction = /^\/market\/auction\/(0x[0-9a-f]{64})$/i.exec(path)
  if (auction) return { view: 'marketplace', auctionNode: auction[1].toLowerCase() }
  const name = /^\/name\/([^/]+)$/.exec(path)
  if (name) {
    const decoded = decodeURIComponent(name[1]).trim().toLowerCase()
    return { view: 'search', name: decoded.endsWith('.dusk') ? decoded : `${decoded}.dusk` }
  }
  const view = (Object.keys(viewPaths) as AppMainView[]).find((key) => viewPaths[key] === path)
  return { view: view ?? 'search' }
}

/** The route in the address bar as the app starts, so its first render shows that page. */
export function openingRoute(): AppRoute {
  return typeof window === 'undefined' ? { view: 'search' } : parseRoute(window.location.pathname)
}

export function routePath(route: AppRoute) {
  if (route.view === 'marketplace' && route.sellName) return `/market/sell/${encodeURIComponent(route.sellName)}`
  if (route.view === 'marketplace' && route.auctionNode) return `/market/auction/${route.auctionNode}`
  return route.name ? `/name/${encodeURIComponent(route.name)}` : viewPaths[route.view]
}

// Links stay real links, so a middle click or a copied address opens the same view.
export function followLink(event: MouseEvent, go: () => void) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  event.preventDefault()
  go()
}
