import type {
  DuskDomainTxState,
  SubnameExpiryPolicy,
  SubnameState,
} from '../../../names/internal'

export type SubdomainsViewProps = {
  canEdit?: boolean
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
  selectedAuthority: string
  subnameExpiryDate: string
  subnameExpiryPolicy: SubnameExpiryPolicy
  subnameLabel: string
  subnameManager: string
  subnameResolver: string
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
  | 'selectedAuthority'
  | 'subnameExpiryDate'
  | 'subnameExpiryPolicy'
  | 'subnameLabel'
  | 'subnameManager'
  | 'subnameResolver'
> & {
  parentExpiryDay: string
  subdomainPreview: string
}

export type SubdomainListProps = Pick<
  SubdomainsViewProps,
  | 'selectedAuthority'
  | 'currentBlockHeight'
  | 'nowSeconds'
  | 'onRecordTargetSelect'
  | 'subnames'
>
