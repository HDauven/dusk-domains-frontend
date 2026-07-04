import type {
  DuskNameTxState,
  SubnameExpiryPolicy,
  SubnameRevocationPolicy,
  SubnameState,
} from '../../../names/internal'

export type SubdomainsViewProps = {
  canCreateSubname: boolean
  canDelegateSubname: boolean
  canRevokeSelectedSubname: boolean
  currentBlockHeight: number | null
  delegateManager: string
  delegateSubnameNode: string
  displayName: string
  error: string
  fallbackManager: string
  managedNameExpiresAt: number
  nowSeconds: number
  onBack: () => void
  onCreateSubname: () => void
  onDelegateManagerChange: (value: string) => void
  onDelegateSubnameChange: (node: string) => void
  onDelegateSubnameSubmit: () => void
  onRecordTargetSelect: (subname: SubnameState) => void
  onRevokeSubname: () => void
  onSubnameExpiryDateChange: (value: string) => void
  onSubnameExpiryPolicyChange: (policy: SubnameExpiryPolicy) => void
  onSubnameLabelChange: (value: string) => void
  onSubnameManagerChange: (value: string) => void
  onSubnameResolverChange: (value: string) => void
  onSubnameRevocationPolicyChange: (policy: SubnameRevocationPolicy) => void
  selectedAuthority: string
  subnameExpiryDate: string
  subnameExpiryPolicy: SubnameExpiryPolicy
  subnameLabel: string
  subnameManager: string
  subnameResolver: string
  subnameRevocationPolicy: SubnameRevocationPolicy
  subnames: SubnameState[]
  txState: DuskNameTxState | null
}

export type SubdomainCreatePanelProps = Pick<
  SubdomainsViewProps,
  | 'canCreateSubname'
  | 'displayName'
  | 'fallbackManager'
  | 'onCreateSubname'
  | 'onSubnameExpiryDateChange'
  | 'onSubnameExpiryPolicyChange'
  | 'onSubnameLabelChange'
  | 'onSubnameManagerChange'
  | 'onSubnameResolverChange'
  | 'onSubnameRevocationPolicyChange'
  | 'selectedAuthority'
  | 'subnameExpiryDate'
  | 'subnameExpiryPolicy'
  | 'subnameLabel'
  | 'subnameManager'
  | 'subnameResolver'
  | 'subnameRevocationPolicy'
> & {
  parentExpiryDay: string
  subdomainPreview: string
}

export type SubdomainListProps = Pick<
  SubdomainsViewProps,
  | 'currentBlockHeight'
  | 'delegateSubnameNode'
  | 'nowSeconds'
  | 'onDelegateManagerChange'
  | 'onDelegateSubnameChange'
  | 'onRecordTargetSelect'
  | 'subnames'
>

export type SubdomainDelegationPanelProps = Pick<
  SubdomainsViewProps,
  | 'canDelegateSubname'
  | 'canRevokeSelectedSubname'
  | 'delegateManager'
  | 'delegateSubnameNode'
  | 'fallbackManager'
  | 'onDelegateManagerChange'
  | 'onDelegateSubnameChange'
  | 'onDelegateSubnameSubmit'
  | 'onRevokeSubname'
  | 'selectedAuthority'
  | 'subnames'
>
