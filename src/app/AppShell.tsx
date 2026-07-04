import type { ReactNode } from 'react'
import type { DuskWalletState } from '../names/internal'
import { HeroBackground } from '../components/scene/HeroBackground'
import type { WalletConnectionStatus } from '../features/wallet/walletStatus'
import type { AppMainView, RuntimeNotice as RuntimeNoticeState } from './AppTypes'
import { RuntimeNotice } from './RuntimeNotice'
import { TopBar } from './TopBar'

export function AppShell({
  children,
  mainView,
  onMainViewChange,
  onOpenWallet,
  onSearchHome,
  pendingReservationCount,
  pendingReservationLabel,
  runtimeNotice,
  walletState,
  walletStatus,
}: {
  children: ReactNode
  mainView: AppMainView
  onMainViewChange: (view: AppMainView) => void
  onOpenWallet: () => void
  onSearchHome: () => void
  pendingReservationCount: number
  pendingReservationLabel: string
  runtimeNotice: RuntimeNoticeState | null
  walletState: DuskWalletState
  walletStatus: WalletConnectionStatus
}) {
  return (
    <main className="page">
      <div className="app-frame">
        <HeroBackground />

        <TopBar
          mainView={mainView}
          onMainViewChange={onMainViewChange}
          onOpenWallet={onOpenWallet}
          onSearchHome={onSearchHome}
          pendingReservationCount={pendingReservationCount}
          pendingReservationLabel={pendingReservationLabel}
          walletState={walletState}
          walletStatus={walletStatus}
        />

        {runtimeNotice ? (
          <RuntimeNotice notice={runtimeNotice} />
        ) : null}

        {children}
      </div>
    </main>
  )
}
