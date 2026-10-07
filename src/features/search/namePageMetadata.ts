import { useEffect } from 'react'
import { defaultDescription, updatePageMetadata } from '../../app/pageMetadata'
import { validateName, type ResolverRecord } from '../../names/internal'

const origin = 'https://dusk.domains'

export function canonicalNameLink(name: string, referrer = '') {
  const url = new URL(`/name/${encodeURIComponent(name)}`, origin)
  if (referrer) url.searchParams.set('ref', referrer)
  return url.href
}

export function useNamePageMetadata(name: string, records: ResolverRecord[]) {
  const validation = validateName(name)
  const canonical = validation.ok ? validation.name.canonical : ''
  const description = records.find(record => record.key === 'text.description' && record.visibility === 'public')?.value.trim() || defaultDescription
  useEffect(() => {
    updatePageMetadata(canonical ? {
      title: `${canonical} · Dusk Domains`, description, url: canonicalNameLink(canonical),
      image: `${origin}/api/share/name/${encodeURIComponent(canonical)}.png`, imageAlt: canonical,
    } : undefined)
    return () => updatePageMetadata()
  }, [canonical, description])
}
