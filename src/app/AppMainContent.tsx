import type { ComponentProps } from 'react'
import { MyDomainsView } from '../features/domains/MyDomainsView'
import { MarketplaceView } from '../features/marketplace/MarketplaceView'
import { ReferralsView } from '../features/referrals/ReferralsView'
import { SearchWorkspace } from '../features/search/SearchWorkspace'
import { TreasuryView } from '../features/treasury/TreasuryView'
import { LegalPage } from '../legal/LegalPage'
import { DevelopersPage } from '../features/developers/DevelopersPage'
import type { AppMainView } from './AppTypes'
import { OwnershipConfirmationNotice } from './OwnershipConfirmationNotice'
import { ViewErrorBoundary } from '../components/status/ViewErrorBoundary'

export function AppMainContent({
  developersProps,
  ownershipConfirmationProps,
  mainView,
  marketplaceProps,
  myDomainsProps,
  referralsProps,
  searchProps,
  treasuryProps,
}: {
  developersProps?: ComponentProps<typeof DevelopersPage>
  ownershipConfirmationProps: ComponentProps<typeof OwnershipConfirmationNotice>
  mainView: AppMainView
  marketplaceProps: ComponentProps<typeof MarketplaceView>
  myDomainsProps: ComponentProps<typeof MyDomainsView>
  referralsProps: ComponentProps<typeof ReferralsView>
  searchProps: ComponentProps<typeof SearchWorkspace>
  treasuryProps: ComponentProps<typeof TreasuryView>
}) {
  // A view that fails to render leaves the header, footer and other pages working.
  return (
    <>
      <OwnershipConfirmationNotice {...ownershipConfirmationProps} />
      <ViewErrorBoundary resetKey={mainView}>
        {mainView === 'terms' || mainView === 'privacy' ? <LegalPage page={mainView} /> : null}
        {mainView === 'developers' && developersProps ? <DevelopersPage {...developersProps} /> : null}
        {mainView === 'search' ? (
          <SearchWorkspace {...searchProps} />
        ) : null}

        {mainView === 'my-names' ? (
          <MyDomainsView {...myDomainsProps} />
        ) : null}

        {mainView === 'marketplace' ? (
          <MarketplaceView {...marketplaceProps} />
        ) : null}

        {mainView === 'treasury' ? (
          <TreasuryView {...treasuryProps} />
        ) : null}

        {mainView === 'referrals' ? (
          <ReferralsView {...referralsProps} />
        ) : null}
      </ViewErrorBoundary>
    </>
  )
}
