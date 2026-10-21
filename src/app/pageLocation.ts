import { useSyncExternalStore } from 'react'

// history.pushState and replaceState change the address without an event. The app announces its
// own changes with this one, so what links to the current page follows them.
const changed = 'dusk-domains:location-changed'
const events = ['popstate', 'hashchange', changed]

export function notifyPageLocation() {
  globalThis.dispatchEvent?.(new Event(changed))
}

function subscribe(onChange: () => void) {
  for (const event of events) globalThis.addEventListener(event, onChange)
  return () => {
    for (const event of events) globalThis.removeEventListener(event, onChange)
  }
}

function read() {
  const { pathname, search, hash } = globalThis.location
  return `${pathname}${search}${hash}`
}

/** The page's path, query and hash. A server render, like the static shell, shows the home page. */
export function usePageLocation() {
  return useSyncExternalStore(subscribe, read, () => '/')
}
