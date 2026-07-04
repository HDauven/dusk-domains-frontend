import type { DuskWalletState } from '../names/internal'
import { NamesMark } from '../components/brand/NamesMark'
import { DuskConnectControl } from '../components/wallet/DuskConnectControl'
import type { WalletConnectionStatus } from '../features/wallet/walletStatus'
import type { AppMainView } from './AppTypes'
import { PrimaryNavigation } from './PrimaryNavigation'

export function TopBar({
  mainView,
  onMainViewChange,
  onOpenWallet,
  onSearchHome,
  pendingReservationCount,
  pendingReservationLabel,
  walletState,
  walletStatus,
}: {
  mainView: AppMainView
  onMainViewChange: (view: AppMainView) => void
  onOpenWallet: () => void
  onSearchHome: () => void
  pendingReservationCount: number
  pendingReservationLabel: string
  walletState: DuskWalletState
  walletStatus: WalletConnectionStatus
}) {
  return (
    <header className="topbar">
      <button className="brand" type="button" aria-label="Dusk Domains home" onClick={onSearchHome}>
        <NamesMark />
        <span className="brand-type">
          <span className="product-name">Dusk Domains</span>
          <span className="product-domain">Domain Service</span>
        </span>
      </button>

      <PrimaryNavigation
        mainView={mainView}
        onMainViewChange={onMainViewChange}
        onSearchHome={onSearchHome}
        pendingReservationCount={pendingReservationCount}
        pendingReservationLabel={pendingReservationLabel}
      />

      <DuskConnectControl
        onOpen={onOpenWallet}
        state={walletState}
        status={walletStatus}
      />
    </header>
  )
}
