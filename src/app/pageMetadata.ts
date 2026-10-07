const origin = 'https://dusk.domains'
export const defaultDescription = 'Search, register and manage .dusk domains for Dusk wallets, contracts and apps.'

export function updatePageMetadata({
  title = 'Dusk Domains',
  description = defaultDescription,
  url = `${origin}/`,
  image = `${origin}/og-image.png`,
  imageAlt = 'Dusk Domains protocol horizon',
} = {}) {
  document.title = title === 'Dusk Domains' ? 'Dusk Domains | .dusk domains for Dusk' : title
  const tags = {
    description,
    'og:title': title, 'og:description': description, 'og:url': url,
    'og:image': image, 'og:image:secure_url': image, 'og:image:type': 'image/png',
    'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': imageAlt,
    'twitter:card': 'summary_large_image', 'twitter:title': title, 'twitter:description': description,
    'twitter:image': image, 'twitter:image:alt': imageAlt,
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
