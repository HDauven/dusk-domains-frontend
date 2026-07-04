import type { IndexedNameSummary } from '../../names/internal'
import { abbreviate } from '../../utils/format'
import { pluralize } from '../registration/registrationCopy'
import type { MyNamePrimarySummary } from './MyDomainsView'

type UseMyDomainsViewModelArgs = {
  myNamePrimarySummaries: Record<string, MyNamePrimarySummary>
  myNames: IndexedNameSummary[]
  pendingReservationCount: number
  selectedAddress: string
}

export function useMyDomainsViewModel({
  myNamePrimarySummaries,
  myNames,
  pendingReservationCount,
  selectedAddress,
}: UseMyDomainsViewModelArgs) {
  const verifiedPrimaryCount = myNames.reduce((count, name) => (
    myNamePrimarySummaries[name.node]?.tone === 'success' ? count + 1 : count
  ), 0)
  const pendingReservationLabel = `${pendingReservationCount} ${pluralize(pendingReservationCount, 'reserved domain', 'reserved domains')}`
  const description = pendingReservationCount > 0 && selectedAddress
    ? `Showing domains and reservations for ${abbreviate(selectedAddress)}`
    : selectedAddress
      ? `Showing domains for ${abbreviate(selectedAddress)}`
      : 'Connect a wallet to show only your domains.'
  const emptyTitle = 'No domains found'
  const emptyCopy = selectedAddress
      ? 'This wallet does not control any domains yet.'
      : 'Connect a wallet or search for a domain to get started.'

  return {
    description,
    emptyCopy,
    emptyTitle,
    heading: 'My Domains',
    pendingReservationLabel,
    verifiedPrimaryCount,
  }
}
