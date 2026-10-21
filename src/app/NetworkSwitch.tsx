import { networkLabel, samePageOn, type OtherNetwork } from './otherNetwork'
import { usePageLocation } from './pageLocation'

/**
 * Mainnet, then testnet. This site's network is the current one; the other links to the same
 * page, with its query, on that network's site. scripts/siteBuild.ts writes the same markup into
 * the static shell.
 */
export function NetworkSwitch({ chainId, other }: { chainId: string, other: OtherNetwork }) {
  const page = usePageLocation()
  const current = <span key="current" aria-current="true">{networkLabel(chainId)}</span>
  const link = <a key="other" href={samePageOn(other.href, page)} title={`Open this page on ${other.host}`}>{other.label}</a>
  return <nav className="network-switch" aria-label="Network">{chainId === 'dusk:1' ? [current, link] : [link, current]}</nav>
}
