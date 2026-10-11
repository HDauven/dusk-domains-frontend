import { useState } from 'react'

// A listing link opens Browse with its name in the search. Each opening gets a new key, so Browse
// starts over with that name; typing afterwards only drops the link from the address.
export function useListingLink(initialName: string) {
  const [link, setLink] = useState({ name: initialName, opened: 0 })
  return {
    listingName: link.name,
    listingKey: link.opened,
    openListing: (name: string) => setLink(current => ({ name, opened: current.opened + 1 })),
    onBrowseQueryChange: (query: string) => setLink(current => (
      current.name && query.trim().toLowerCase() !== current.name ? { ...current, name: '' } : current
    )),
    clearListing: () => setLink(current => current.name ? { ...current, name: '' } : current),
  }
}
