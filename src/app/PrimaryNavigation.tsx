import type { AppMainView } from './AppTypes'
import { followLink, routePath } from './routes'

const items: Array<{ view: AppMainView, label: string }> = [
  { view: 'search', label: 'Search' },
  { view: 'marketplace', label: 'Market' },
  { view: 'my-names', label: 'My names' },
  { view: 'referrals', label: 'Referrals' },
]

export function PrimaryNavigation({
  mainView,
  onMainViewChange,
  onSearchHome,
  pendingReservationCount,
  pendingReservationLabel,
}: {
  mainView: AppMainView
  onMainViewChange: (view: AppMainView) => void
  onSearchHome: () => void
  pendingReservationCount: number
  pendingReservationLabel: string
}) {
  return (
    <nav className="nav-links" aria-label="Primary">
      {items.map(({ view, label }) => (
        <a
          key={view}
          className={mainView === view ? 'active' : ''}
          aria-current={mainView === view ? 'page' : undefined}
          href={routePath({ view })}
          onClick={(event) => followLink(event, () => (view === 'search' ? onSearchHome() : onMainViewChange(view)))}
        >
          <span>{label}</span>
          {view === 'my-names' && pendingReservationCount > 0 ? (
            <span className="nav-count-badge" aria-label={pendingReservationLabel}>
              {pendingReservationCount}
            </span>
          ) : null}
        </a>
      ))}
    </nav>
  )
}
