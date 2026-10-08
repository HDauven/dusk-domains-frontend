export function reportNameUrl(destination: string | null | undefined, name: string): string | null {
  if (!destination) return null
  let url: URL
  try { url = new URL(destination) } catch { return destination }
  if (url.protocol === 'https:' && url.hostname === 'github.com' && /^\/[^/]+\/[^/]+\/issues\/new\/?$/.test(url.pathname)) {
    url.searchParams.set('title', `[Abuse]: ${name}`)
    url.searchParams.set('name', name)
  } else if (url.protocol === 'mailto:') {
    url.searchParams.set('subject', `[Abuse]: ${name}`)
    const body = url.searchParams.get('body')
    url.searchParams.set('body', `Name: ${name}${body ? `\n\n${body}` : ''}`)
  } else return destination
  // Mail clients read + in the query as a literal plus; spaces must be %20. The address keeps its own +.
  return url.protocol === 'mailto:' ? `${url.href.split('?')[0]}?${url.search.slice(1).replace(/\+/g, '%20')}` : url.href
}
