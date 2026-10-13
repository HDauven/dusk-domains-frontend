import { useMarketplaceFeature } from '../features/marketplace/useMarketplaceFeature'
import { useRuntimeNotice } from './useRuntimeNotice'
import type { AppViewModelInputs } from './appViewTypes'
import { useDomainManagementFeature } from '../features/domains/useDomainManagementFeature'
import { useRegistrationFeature } from '../features/registration/useRegistrationFeature'
import { useAppSearchProps } from './useAppSearchProps'
import { useHeldListing } from './useHeldListing'

export function useAppViewProps(inputs: AppViewModelInputs) {
  const { registrationProps } = useRegistrationFeature(inputs)
  // Read once for the name page and for renewing a listed name.
  const heldListing = useHeldListing(inputs)
  const management = useDomainManagementFeature({ ...inputs, heldListing })
  const { searchProps } = useAppSearchProps({ ...inputs, management, registrationProps, heldListing })
  const { appRuntime, walletRuntime, searchState } = inputs
  const marketplace = useMarketplaceFeature({
    tradingPaused: appRuntime.pause.tradingPaused,
    preferredMarketplace: appRuntime.marketplaceContractId,
    ensurePublicBalanceForLiveWrite: walletRuntime.ensurePublicBalanceForLiveWrite,
    duskDomainsOnChainClient: appRuntime.duskDomainsOnChainClient,
    indexerClient: appRuntime.indexerClient,
    marketplaceOnChainClient: appRuntime.marketplaceOnChainClient,
    liveWritesAvailable: !appRuntime.writeAccess.readOnly,
    mainView: searchState.mainView,
    openingRoute: searchState.openingRoute,
    onOpenWalletConnection: () => void walletRuntime.handleOpenWalletConnection(),
    runtimeConfig: appRuntime.runtimeConfig,
    selectedAddress: walletRuntime.selectedAddress,
    selectedAuthority: walletRuntime.selectedAuthority,
    submitNameWrite: walletRuntime.submitNameWrite,
  })
  const runtimeNotice = useRuntimeNotice({
    indexerConfirmation: inputs.searchState.mainView === 'search' ? '' : inputs.searchState.indexerConfirmation,
    indexerError: inputs.searchState.mainView === 'search' ? '' : inputs.searchState.indexerError,
    walletError: inputs.searchState.resultView === 'register' ? '' : inputs.walletRuntime.walletError,
  })

  return {
    marketplace,
    mainContentProps: {
      developersProps: { runtimeConfig: appRuntime.runtimeConfig, origin: typeof window === 'undefined' ? 'https://dusk.domains' : window.location.origin },
      marketplaceProps: marketplace.marketplaceProps,
      ownershipConfirmationProps: {
        pending: inputs.domainState.pendingOwnership,
        onRetry: (node: string) => void inputs.domainState.retryOwnershipConfirmation(node).then(confirmed => {
          if (confirmed) void inputs.searchRuntime.refreshCurrentNameFromIndexer({ fresh: true })
        }),
      },
      mainView: inputs.searchState.mainView,
      myDomainsProps: { ...inputs.mainViewRuntime.myDomainsProps, registrationsPaused: appRuntime.pause.registrationsPaused },
      referralsProps: inputs.economicsRuntime.referralsProps,
      searchProps,
      treasuryProps: inputs.economicsRuntime.treasuryProps,
    },
    runtimeNotice,
  }
}
