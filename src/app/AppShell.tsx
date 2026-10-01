import { NetworkFreshnessContext } from './networkFreshness'
import { useIndexerFreshness } from './useIndexerFreshness'
import { NetworkStatus } from './NetworkStatus'
import { WalletDialog } from '../components/wallet/WalletDialog'
import type { ComponentProps, ReactNode } from 'react'
import { OperatorPauseBanner } from './OperatorPauseBanner'
import { unpaused, type OperatorPause } from './operatorPause'
import type { DuskDomainsIndexerClient, DuskDomainsRuntimeConfig, DuskWalletState } from '../names/internal'
import { SkyBackground, type SkyName } from '../components/scene/SkyBackground'
import type { WalletConnectionStatus } from '../features/wallet/walletStatus'
import type { AppMainView, RuntimeNotice as RuntimeNoticeState } from './AppTypes'
import { RuntimeNotice } from './RuntimeNotice'
import { SiteFooter } from './SiteFooter'
import { TopBar, type NetworkBadge } from './TopBar'

export function AppShell({
  networkStatus,
  walletDialog,
  pause = unpaused,
  children,
  launchLinks,
  mainView,
  network,
  onMainViewChange,
  onOpenName,
  onOpenWallet,
  onSearchHome,
  pendingReservationCount,
  runtimeNotice,
  searching,
  skyNames,
  walletState,
  walletStatus,
}: {
  networkStatus?: { config: DuskDomainsRuntimeConfig; client: DuskDomainsIndexerClient | null; readOnly?: boolean }
  walletDialog?: ComponentProps<typeof WalletDialog>
  pause?: OperatorPause
  children: ReactNode
  launchLinks: DuskDomainsRuntimeConfig['launchLinks']
  mainView: AppMainView
  network: NetworkBadge
  onMainViewChange: (view: AppMainView) => void
  onOpenName: (name: string) => void
  onOpenWallet: () => void
  onSearchHome: () => void
  pendingReservationCount: number
  runtimeNotice: RuntimeNoticeState | null
  searching: boolean
  skyNames: SkyName[]
  walletState: DuskWalletState
  walletStatus: WalletConnectionStatus
}) {
  const freshness = useIndexerFreshness(networkStatus?.client ?? null, networkStatus?.config.mode !== 'live_ready')
  return (
    <div className={mainView === 'search' && !searching ? 'page at-home' : 'page'}>
      <SkyBackground names={skyNames} onOpenName={onOpenName} />

      <TopBar
        mainView={mainView}
        network={network}
        onMainViewChange={onMainViewChange}
        onOpenWallet={onOpenWallet}
        onSearchHome={onSearchHome}
        pendingReservationCount={pendingReservationCount}
        walletState={walletState}
        walletStatus={walletStatus}
      />

      {networkStatus ? <NetworkStatus readOnly={networkStatus.readOnly} config={networkStatus.config} message={freshness} /> : null}

      {runtimeNotice ? (
        <RuntimeNotice notice={runtimeNotice} />
      ) : null}

      <main className="page-main">
        <OperatorPauseBanner pause={pause} />
        <NetworkFreshnessContext value={freshness}>{children}</NetworkFreshnessContext>
      </main>

      {walletDialog ? <WalletDialog {...walletDialog} /> : null}

      <SiteFooter links={launchLinks} onMainViewChange={onMainViewChange} />
    </div>
  )
}
