import type {
  DomainManagementFeatureProps,
  UseDomainManagementFeatureProps,
} from './domainManagementFeatureTypes'
import {
  buildPrimaryProps,
  buildRecordsProps,
  buildSettingsProps,
  buildSubdomainsProps,
} from './domainManagementProps'
import { useDomainManagementActionHandlers } from './useDomainManagementActionHandlers'

export function useDomainManagementFeature(props: UseDomainManagementFeatureProps): DomainManagementFeatureProps {
  const {
    handleClearPrimaryName,
    handleCreateSubname,
    handleDelegateSubname,
    handleOwnershipUpdate,
    handleRecordClear,
    handleRecordsSave,
    handleRenewName,
    handleResolverUpdate,
    handleRevokeSubname,
    handleSetPrimaryName,
  } = useDomainManagementActionHandlers(props)

  return {
    primaryProps: buildPrimaryProps({
      ...props,
      handleClearPrimaryName,
      handleSetPrimaryName,
    }),
    recordsProps: buildRecordsProps({
      ...props,
      handleRecordClear,
      handleRecordsSave,
    }),
    settingsProps: buildSettingsProps({
      ...props,
      handleOwnershipUpdate,
      handleRenewName,
      handleResolverUpdate,
    }),
    subdomainsProps: buildSubdomainsProps({
      ...props,
      handleCreateSubname,
      handleDelegateSubname,
      handleRevokeSubname,
    }),
  }
}
