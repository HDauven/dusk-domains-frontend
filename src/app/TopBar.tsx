import type { DuskWalletState } from '../names/internal'
import { NamesMark } from '../components/brand/NamesMark'
import { DuskConnectControl } from '../components/wallet/DuskConnectControl'
import type { WalletConnectionStatus } from '../features/wallet/walletStatus'
import type { AppMainView } from './AppTypes'
import { PrimaryNavigation } from './PrimaryNavigation'

export type NetworkBadge = { label: string, tone: 'mainnet' | 'testnet' | 'local' | 'preview' }

export function TopBar({
  mainView,
  network,
  onMainViewChange,
  onOpenWallet,
  onSearchHome,
  pendingReservationCount,
  pendingReservationLabel,
  walletState,
  walletStatus,
}: {
  mainView: AppMainView
  network: NetworkBadge
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
      <div className="topbar-brand">
        <a
          className="brand"
          href="/"
          aria-label="Dusk Domains home"
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey) return
            event.preventDefault()
            onSearchHome()
          }}
        >
          <NamesMark />
          <span className="brand-name">Dusk Domains</span>
        </a>
        <span className={`network-badge ${network.tone}`} title={`Connected to Dusk ${network.label.toLowerCase()}`}>
          {network.label}
        </span>
      </div>

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
