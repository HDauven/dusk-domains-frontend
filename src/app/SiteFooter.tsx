import type { DuskDomainsRuntimeConfig } from '../names/internal'
import type { AppMainView } from './AppTypes'
import { followLink, routePath } from './routes'

const pages: Array<{ view: AppMainView, label: string }> = [
  { view: 'referrals', label: 'Referrals' },
  { view: 'treasury', label: 'Treasury' },
  { view: 'developers', label: 'Developers' },
  { view: 'terms', label: 'Terms' },
  { view: 'privacy', label: 'Privacy' },
]

// Support opens GitHub's form chooser, which also offers feature requests, abuse reports and
// private security reports. The Developers page links the SDK and API; the header switches network.
export function SiteFooter({
  links,
  onMainViewChange,
}: {
  links: DuskDomainsRuntimeConfig['launchLinks']
  onMainViewChange: (view: AppMainView) => void
}) {
  return (
    <footer className="site-footer">
      <p>Dusk Domains · Built by <a href="https://www.mochavi.com/">Mochavi</a></p>
      <nav aria-label="Footer">
        {pages.map(({ view, label }) => (
          <a key={view} href={routePath({ view })} onClick={(event) => followLink(event, () => onMainViewChange(view))}>{label}</a>
        ))}
        {links.support ? <a href={links.support} target="_blank" rel="noreferrer">Support</a> : null}
      </nav>
    </footer>
  )
}
