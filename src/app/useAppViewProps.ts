import { useRuntimeNotice } from './useRuntimeNotice'
import type { AppViewModelInputs } from './appViewTypes'
import { buildDomainManagementFeatureProps } from './domainManagementFeatureAdapter'
import { buildRegistrationFeatureProps } from './registrationFeatureAdapter'
import { useDomainManagementFeature } from '../features/domains/useDomainManagementFeature'
import { useRegistrationFeature } from '../features/registration/useRegistrationFeature'
import { useAppSearchProps } from './useAppSearchProps'

export function useAppViewProps(inputs: AppViewModelInputs) {
  const { registrationProps } = useRegistrationFeature(buildRegistrationFeatureProps(inputs))
  const {
    primaryProps,
    recordsProps,
    settingsProps,
    subdomainsProps,
  } = useDomainManagementFeature(buildDomainManagementFeatureProps(inputs))
  const { searchProps } = useAppSearchProps({
    ...inputs,
    primaryProps,
    recordsProps,
    registrationProps,
    settingsProps,
    subdomainsProps,
  })
  const runtimeNotice = useRuntimeNotice({
    indexerConfirmation: inputs.searchState.indexerConfirmation,
    indexerError: inputs.searchState.indexerError,
    walletError: inputs.walletRuntime.walletError,
  })

  return {
    mainContentProps: {
      mainView: inputs.searchState.mainView,
      myDomainsProps: inputs.mainViewRuntime.myDomainsProps,
      referralsProps: inputs.economicsRuntime.referralsProps,
      searchProps,
      treasuryProps: inputs.economicsRuntime.treasuryProps,
    },
    runtimeNotice,
  }
}
