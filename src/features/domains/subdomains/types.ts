import type {
  DuskDomainTxState,
  SubnameExpiryPolicy,
  SubnameRevocationPolicy,
  SubnameState,
} from '../../../names/internal'

export type SubdomainsViewProps = {
  canCreateSubname: boolean
  currentBlockHeight: number | null
  displayName: string
  error: string
  fallbackManager: string
  managedNameExpiresAt: number
  nowSeconds: number
  onCreateSubname: () => void
  onRecordTargetSelect: (subname: SubnameState) => void
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
  txState: DuskDomainTxState | null
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
  | 'nowSeconds'
  | 'onRecordTargetSelect'
  | 'subnames'
>
