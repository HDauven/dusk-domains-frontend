import type { ComponentProps } from 'react'
import { MyDomainsView } from '../features/domains/MyDomainsView'
import { MarketplaceView } from '../features/marketplace/MarketplaceView'
import { ReferralsView } from '../features/referrals/ReferralsView'
import { SearchWorkspace } from '../features/search/SearchWorkspace'
import { TreasuryView } from '../features/treasury/TreasuryView'
import { LegalPage } from '../legal/LegalPage'
import type { AppMainView } from './AppTypes'
import { OwnershipConfirmationNotice } from './OwnershipConfirmationNotice'

export function AppMainContent({
  ownershipConfirmationProps,
  mainView,
  marketplaceProps,
  myDomainsProps,
  referralsProps,
  searchProps,
  treasuryProps,
}: {
  ownershipConfirmationProps: ComponentProps<typeof OwnershipConfirmationNotice>
  mainView: AppMainView
  marketplaceProps: ComponentProps<typeof MarketplaceView>
  myDomainsProps: ComponentProps<typeof MyDomainsView>
  referralsProps: ComponentProps<typeof ReferralsView>
  searchProps: ComponentProps<typeof SearchWorkspace>
  treasuryProps: ComponentProps<typeof TreasuryView>
}) {
  return (
    <>
      {mainView === 'terms' || mainView === 'privacy' ? <LegalPage page={mainView} /> : null}
      <OwnershipConfirmationNotice {...ownershipConfirmationProps} />
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
    </>
  )
}
