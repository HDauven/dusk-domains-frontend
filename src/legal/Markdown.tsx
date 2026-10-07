import type { ReactNode } from 'react'

function linkTarget(href: string) {
  const base = typeof window === 'undefined' ? 'https://dusk.domains/' : window.location.href
  try {
    const url = new URL(href, base)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    const external = url.origin !== new URL(base).origin
    if (external && !/^https?:\/\//i.test(href)) return null
    return { external }
  } catch {
    return null
  }
}

function inline(source: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const tokens = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^\s)]+)\)/g
  let position = 0
  for (const match of source.matchAll(tokens)) {
    nodes.push(source.slice(position, match.index))
    const [token, code, bold, label, href] = match
    const key = match.index
    if (code !== undefined) nodes.push(<code key={key}>{code}</code>)
    else if (bold !== undefined) nodes.push(<strong key={key}>{inline(bold)}</strong>)
    else {
      const target = linkTarget(href)
      nodes.push(target
        ? <a key={key} href={href} target={target.external ? '_blank' : undefined} rel={target.external ? 'noreferrer' : undefined}>{label}</a>
        : token)
    }
    position = match.index + token.length
  }
  nodes.push(source.slice(position))
  return nodes
}

// Only the constructs used by our legal documents; source text always stays React text.
export function Markdown({ source }: { source: string }) {
  const lines = source.replaceAll('\r\n', '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    const key = index++
    if (!line.trim()) continue
    const heading = /^(#{1,2}) (.+)$/.exec(line)
    if (heading) {
      const Heading = heading[1] === '#' ? 'h1' : 'h2'
      blocks.push(<Heading key={key}>{inline(heading[2])}</Heading>)
    } else if (line.startsWith('- ')) {
      const items = [line.slice(2)]
      while (lines[index]?.startsWith('- ')) items.push(lines[index++].slice(2))
      blocks.push(<ul key={key}>{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ul>)
    } else {
      const paragraph = [line]
      while (index < lines.length && lines[index].trim() && !/^(#{1,2} |- )/.test(lines[index])) paragraph.push(lines[index++])
      blocks.push(<p key={key}>{inline(paragraph.join(' '))}</p>)
    }
  }
  return <>{blocks}</>
}
