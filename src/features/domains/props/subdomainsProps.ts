import type {
  DomainManagementFeatureProps,
  UseDomainManagementFeatureProps,
} from '../domainManagementFeatureTypes'
import type { AsyncAction } from './types'

type SubdomainsPropsArgs = Pick<
  UseDomainManagementFeatureProps,
  | 'canCreateSubname'
  | 'canDelegateSubname'
  | 'canRevokeSelectedSubname'
  | 'currentBlockHeight'
  | 'delegateManager'
  | 'delegateSubnameNode'
  | 'displayName'
  | 'fallbackManager'
  | 'managedName'
  | 'nowSeconds'
  | 'onBackToDetails'
  | 'selectedAuthority'
  | 'setCriticalRecordConfirmation'
  | 'setDelegateManager'
  | 'setDelegateSubnameNode'
  | 'setPublicRecordAcknowledged'
  | 'setRecordDrafts'
  | 'setRecordError'
  | 'setRecordTargetNode'
  | 'setSubnameExpiryDate'
  | 'setSubnameExpiryPolicy'
  | 'setSubnameLabel'
  | 'setSubnameManager'
  | 'setSubnameResolver'
  | 'setSubnameRevocationPolicy'
  | 'subnameError'
  | 'subnameExpiryDate'
  | 'subnameExpiryPolicy'
  | 'subnameLabel'
  | 'subnameManager'
  | 'subnameResolver'
  | 'subnameRevocationPolicy'
  | 'subnames'
  | 'subnameTxState'
> & {
  handleCreateSubname: AsyncAction
  handleDelegateSubname: AsyncAction
  handleRevokeSubname: AsyncAction
}

export function buildSubdomainsProps({
  canCreateSubname,
  canDelegateSubname,
  canRevokeSelectedSubname,
  currentBlockHeight,
  delegateManager,
  delegateSubnameNode,
  displayName,
  fallbackManager,
  handleCreateSubname,
  handleDelegateSubname,
  handleRevokeSubname,
  managedName,
  nowSeconds,
  onBackToDetails,
  selectedAuthority,
  setCriticalRecordConfirmation,
  setDelegateManager,
  setDelegateSubnameNode,
  setPublicRecordAcknowledged,
  setRecordDrafts,
  setRecordError,
  setRecordTargetNode,
  setSubnameExpiryDate,
  setSubnameExpiryPolicy,
  setSubnameLabel,
  setSubnameManager,
  setSubnameResolver,
  setSubnameRevocationPolicy,
  subnameError,
  subnameExpiryDate,
  subnameExpiryPolicy,
  subnameLabel,
  subnameManager,
  subnameResolver,
  subnameRevocationPolicy,
  subnames,
  subnameTxState,
}: SubdomainsPropsArgs): DomainManagementFeatureProps['subdomainsProps'] {
  return {
    canCreateSubname,
    canDelegateSubname,
    canRevokeSelectedSubname,
    currentBlockHeight,
    delegateManager,
    delegateSubnameNode,
    displayName,
    error: subnameError,
    fallbackManager,
    managedNameExpiresAt: managedName.expiresAt,
    nowSeconds,
    onBack: onBackToDetails,
    onCreateSubname: () => void handleCreateSubname(),
    onDelegateManagerChange: setDelegateManager,
    onDelegateSubnameChange: setDelegateSubnameNode,
    onDelegateSubnameSubmit: () => void handleDelegateSubname(),
    onRecordTargetSelect: (subname) => {
      setRecordTargetNode(subname.node)
      setRecordDrafts({})
      setRecordError('')
      setPublicRecordAcknowledged(false)
      setCriticalRecordConfirmation('')
    },
    onRevokeSubname: () => void handleRevokeSubname(),
    onSubnameExpiryDateChange: setSubnameExpiryDate,
    onSubnameExpiryPolicyChange: setSubnameExpiryPolicy,
    onSubnameLabelChange: setSubnameLabel,
    onSubnameManagerChange: setSubnameManager,
    onSubnameResolverChange: setSubnameResolver,
    onSubnameRevocationPolicyChange: setSubnameRevocationPolicy,
    selectedAuthority,
    subnameExpiryDate,
    subnameExpiryPolicy,
    subnameLabel,
    subnameManager,
    subnameResolver,
    subnameRevocationPolicy,
    subnames,
    txState: subnameTxState,
  }
}
