import type { PendingConfirmation } from './confirmationRead'
import { TransactionStatusNotice } from '../components/status/TransactionStatusNotice'
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
import type { NetworkSites } from './otherNetwork'
import { RuntimeNotice } from './RuntimeNotice'
import { SiteFooter } from './SiteFooter'
import { TopBar, type NetworkBadge } from './TopBar'
import { WalletNetworkBanner } from './WalletNetworkBanner'

export function AppShell({ networkStatus, pendingConfirmation, pause = unpaused, children, launchLinks, network, runtimeNotice, sites, skyNames, wallet, navigation }: {
  pendingConfirmation?: PendingConfirmation | null
  networkStatus?: { config: DuskDomainsRuntimeConfig; client: DuskDomainsIndexerClient | null; readOnly?: boolean }
  pause?: OperatorPause
  children: ReactNode
  launchLinks: DuskDomainsRuntimeConfig['launchLinks']
  network: NetworkBadge
  runtimeNotice: RuntimeNoticeState | null
  /** This site's network and the other network's site, for the header switch and the wallet banner. */
  sites?: NetworkSites
  skyNames: SkyName[]
  wallet: {
    walletDialog?: ComponentProps<typeof WalletDialog>
    onOpenWallet: () => void
    walletState: DuskWalletState
    walletStatus: WalletConnectionStatus
  }
  navigation: {
    mainView: AppMainView
    onMainViewChange: (view: AppMainView) => void
    onOpenName: (name: string) => void
    onSearchHome: () => void
    pendingReservationCount: number
    searching: boolean
  }
}) {
  const {
    walletDialog,
    onOpenWallet,
    walletState,
    walletStatus,
  } = wallet
  const {
    mainView,
    onMainViewChange,
    onOpenName,
    onSearchHome,
    pendingReservationCount,
    searching,
  } = navigation
  const freshness = useIndexerFreshness(networkStatus?.client ?? null, networkStatus?.config.mode !== 'live_ready')
  const pageShowsReadNotice = mainView === 'marketplace' || mainView === 'treasury' || (mainView === 'search' && searching)
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
        sites={sites}
        walletState={walletState}
        walletStatus={walletStatus}
      />

      {sites ? <WalletNetworkBanner sites={sites} walletChainId={walletState.chainId} walletStatus={walletStatus} onSwitchWallet={onOpenWallet} /> : null}

      {networkStatus ? <NetworkStatus readOnly={networkStatus.readOnly} config={networkStatus.config} message={pageShowsReadNotice || runtimeNotice ? null : freshness} /> : null}

      {runtimeNotice ? (
        <RuntimeNotice notice={runtimeNotice} />
      ) : null}

      <main className="page-main">
        <OperatorPauseBanner pause={pause} />
        {pendingConfirmation?.state.retryConfirmation ? <section aria-label="Pending transaction" key={pendingConfirmation.state.txId}>
          <p>{'action' in pendingConfirmation ? pendingConfirmation.action : pendingConfirmation.name}</p>
          <TransactionStatusNotice state={pendingConfirmation.state} />
        </section> : null}
        <NetworkFreshnessContext value={freshness}>{children}</NetworkFreshnessContext>
      </main>

      {walletDialog ? <WalletDialog {...walletDialog} /> : null}

      <SiteFooter links={launchLinks} onMainViewChange={onMainViewChange} />
    </div>
  )
}
