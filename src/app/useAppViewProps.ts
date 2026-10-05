import { useMarketplaceFeature } from '../features/marketplace/useMarketplaceFeature'
import { useRuntimeNotice } from './useRuntimeNotice'
import type { AppViewModelInputs } from './appViewTypes'
import { useDomainManagementFeature } from '../features/domains/useDomainManagementFeature'
import { useRegistrationFeature } from '../features/registration/useRegistrationFeature'
import { useAppSearchProps } from './useAppSearchProps'

export function useAppViewProps(inputs: AppViewModelInputs) {
  const { registrationProps } = useRegistrationFeature(inputs)
  const management = useDomainManagementFeature(inputs)
  const { searchProps } = useAppSearchProps({ ...inputs, management, registrationProps })
  const { appRuntime, walletRuntime, searchState } = inputs
  const marketplace = useMarketplaceFeature({
    tradingPaused: appRuntime.pause.tradingPaused,
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
    indexerError: inputs.searchState.indexerError,
    walletError: inputs.searchState.resultView === 'register' ? '' : inputs.walletRuntime.walletError,
  })

  return {
    marketplace,
    mainContentProps: {
      marketplaceProps: marketplace.marketplaceProps,
      ownershipConfirmationProps: {
        pending: inputs.domainState.pendingOwnership,
        onRetry: (node: string) => void inputs.domainState.retryOwnershipConfirmation(node),
      },
      mainView: inputs.searchState.mainView,
      myDomainsProps: inputs.mainViewRuntime.myDomainsProps,
      referralsProps: inputs.economicsRuntime.referralsProps,
      searchProps,
      treasuryProps: inputs.economicsRuntime.treasuryProps,
    },
    runtimeNotice,
  }
}
