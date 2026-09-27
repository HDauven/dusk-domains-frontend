import type { MouseEvent } from 'react'
import type { AppMainView } from './AppTypes'

export type AppRoute = { view: AppMainView, name?: string }

const viewPaths: Record<AppMainView, string> = {
  search: '/',
  'my-names': '/my',
  marketplace: '/market',
  referrals: '/referrals',
  treasury: '/treasury',
}

export function parseRoute(pathname: string): AppRoute {
  const path = pathname.replace(/\/+$/, '') || '/'
  const name = /^\/name\/([^/]+)$/.exec(path)
  if (name) {
    const decoded = decodeURIComponent(name[1]).trim().toLowerCase()
    return { view: 'search', name: decoded.endsWith('.dusk') ? decoded : `${decoded}.dusk` }
  }
  const view = (Object.keys(viewPaths) as AppMainView[]).find((key) => viewPaths[key] === path)
  return { view: view ?? 'search' }
}

export function routePath(route: AppRoute) {
  return route.name ? `/name/${encodeURIComponent(route.name)}` : viewPaths[route.view]
}

// Links stay real links, so a middle click or a copied address opens the same view.
export function followLink(event: MouseEvent, go: () => void) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  event.preventDefault()
  go()
}
