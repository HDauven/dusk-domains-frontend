import type { AppMainView } from './AppTypes'

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
      <button
        className={mainView === 'search' ? 'active' : ''}
        type="button"
        onClick={onSearchHome}
      >
        Search
      </button>
      <button
        className={mainView === 'my-names' ? 'active' : ''}
        type="button"
        onClick={() => onMainViewChange('my-names')}
      >
        <span>My Domains</span>
        {pendingReservationCount > 0 ? (
          <span className="nav-count-badge" aria-label={pendingReservationLabel}>
            {pendingReservationCount}
          </span>
        ) : null}
      </button>
      <button
        className={mainView === 'treasury' ? 'active' : ''}
        type="button"
        onClick={() => onMainViewChange('treasury')}
      >
        Treasury
      </button>
      <button
        className={mainView === 'marketplace' ? 'active' : ''}
        type="button"
        onClick={() => onMainViewChange('marketplace')}
      >
        Marketplace
      </button>
      <button
        className={mainView === 'referrals' ? 'active' : ''}
        type="button"
        onClick={() => onMainViewChange('referrals')}
      >
        Referrals
      </button>
    </nav>
  )
}
