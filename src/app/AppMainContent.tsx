import type { ComponentProps } from 'react'
import { MyDomainsView } from '../features/domains/MyDomainsView'
import { ReferralsView } from '../features/referrals/ReferralsView'
import { SearchWorkspace } from '../features/search/SearchWorkspace'
import { TreasuryView } from '../features/treasury/TreasuryView'
import type { AppMainView } from './AppTypes'

export function AppMainContent({
  mainView,
  myDomainsProps,
  referralsProps,
  searchProps,
  treasuryProps,
}: {
  mainView: AppMainView
  myDomainsProps: ComponentProps<typeof MyDomainsView>
  referralsProps: ComponentProps<typeof ReferralsView>
  searchProps: ComponentProps<typeof SearchWorkspace>
  treasuryProps: ComponentProps<typeof TreasuryView>
}) {
  return (
    <>
      {mainView === 'search' ? (
        <SearchWorkspace {...searchProps} />
      ) : null}

      {mainView === 'my-names' ? (
        <MyDomainsView {...myDomainsProps} />
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
