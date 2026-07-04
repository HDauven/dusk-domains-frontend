import { useRuntimeNotice } from './useRuntimeNotice'
import type { AppViewModelInputs } from './appViewTypes'
import { useAppDomainManagementProps } from './useAppDomainManagementProps'
import { useAppRegistrationProps } from './useAppRegistrationProps'
import { useAppSearchProps } from './useAppSearchProps'

export function useAppViewProps(inputs: AppViewModelInputs) {
  const { registrationProps } = useAppRegistrationProps(inputs)
  const {
    primaryProps,
    recordsProps,
    settingsProps,
    subdomainsProps,
  } = useAppDomainManagementProps(inputs)
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
