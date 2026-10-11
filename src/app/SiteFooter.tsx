import type { DuskDomainsRuntimeConfig } from '../names/internal'
import type { AppMainView } from './AppTypes'
import { followLink, routePath } from './routes'
import { otherNetwork } from './otherNetwork'
import { developerLinks } from '../features/developers/developerLinks'

export function SiteFooter({
  links,
  onMainViewChange,
}: {
  links: DuskDomainsRuntimeConfig['launchLinks']
  onMainViewChange: (view: AppMainView) => void
}) {
  const network = otherNetwork(import.meta.env)
  const external = [
    ['Support', links.support],
    ['Report abuse', links.abuse],
    ['Security', links.security],
    ['Status', links.status],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]))

  return (
    <footer className="site-footer">
      <p>Dusk Domains · Built by <a href="https://www.mochavi.com/">Mochavi</a></p>
      <nav aria-label="Footer">
        <a href={routePath({ view: 'referrals' })} onClick={(event) => followLink(event, () => onMainViewChange('referrals'))}>Referrals</a>
        <a href={routePath({ view: 'treasury' })} onClick={(event) => followLink(event, () => onMainViewChange('treasury'))}>Treasury</a>
        <a href={routePath({ view: 'terms' })} onClick={(event) => followLink(event, () => onMainViewChange('terms'))}>Terms</a>
        <a href={routePath({ view: 'privacy' })} onClick={(event) => followLink(event, () => onMainViewChange('privacy'))}>Privacy</a>
        <a href={routePath({ view: 'developers' })} onClick={(event) => followLink(event, () => onMainViewChange('developers'))}>Developers</a>
        {developerLinks.filter(link => link.label !== 'SDK source').map(link => (
          <a key={link.href} href={link.href} {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{link.label === 'SDK on JSR' ? 'SDK' : link.label === 'API reference' ? 'API' : link.label}</a>
        ))}
        {external.map(([label, href]) => (
          <a key={label} href={href} target="_blank" rel="noreferrer">{label}</a>
        ))}
        {network ? <a href={network.href}>{network.label}</a> : null}
      </nav>
    </footer>
  )
}
