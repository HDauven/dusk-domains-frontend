import { useEffect } from 'react'
import { validateName, type ResolverRecord } from '../../names/internal'

const origin = 'https://dusk.domains'
const defaultDescription = 'Search, register and manage .dusk domains for Dusk wallets, contracts and apps.'

export function canonicalNameLink(name: string, referrer = '') {
  const url = new URL(`/name/${encodeURIComponent(name)}`, origin)
  if (referrer) url.searchParams.set('ref', referrer)
  return url.href
}

function updateMetadata(name = '', description = defaultDescription) {
  const title = name ? `${name} · Dusk Domains` : 'Dusk Domains'
  const url = name ? canonicalNameLink(name) : `${origin}/`
  const image = name ? `${origin}/api/share/name/${encodeURIComponent(name)}.png` : `${origin}/og-image.png`
  document.title = name ? title : 'Dusk Domains | .dusk domains for Dusk'
  const tags = {
    description,
    'og:title': title, 'og:description': description, 'og:url': url,
    'og:image': image, 'og:image:secure_url': image, 'og:image:type': 'image/png',
    'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': name || 'Dusk Domains protocol horizon',
    'twitter:card': 'summary_large_image', 'twitter:title': title, 'twitter:description': description,
    'twitter:image': image, 'twitter:image:alt': name || 'Dusk Domains protocol horizon',
  }
  for (const [key, content] of Object.entries(tags)) {
    const attribute = key.startsWith('og:') ? 'property' : 'name'
    const matches = [...document.head.querySelectorAll<HTMLMetaElement>(`meta[${attribute}="${key}"]`)]
    const element = matches.shift() ?? document.createElement('meta')
    for (const duplicate of matches) duplicate.remove()
    element.setAttribute(attribute, key)
    element.content = content
    if (!element.isConnected) document.head.append(element)
  }
  const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]') ?? document.createElement('link')
  canonical.rel = 'canonical'
  canonical.href = url
  if (!canonical.isConnected) document.head.append(canonical)
}

export function useNamePageMetadata(name: string, records: ResolverRecord[]) {
  const validation = validateName(name)
  const canonical = validation.ok ? validation.name.canonical : ''
  const description = records.find(record => record.key === 'text.description' && record.visibility === 'public')?.value.trim() || defaultDescription
  useEffect(() => {
    updateMetadata(canonical, canonical ? description : defaultDescription)
    return () => updateMetadata()
  }, [canonical, description])
}
