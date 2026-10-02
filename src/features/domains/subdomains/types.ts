import type { NamespaceTarget } from '../namespaceActions'
import type {
  DuskDomainTxState,
  SubnameExpiryPolicy,
  SubnameState,
} from '../../../names/internal'

export type SubdomainsViewProps = {
  ownerAddresses?: string[]
  canEdit?: boolean
  canControlSubname?: (subname: NamespaceTarget) => boolean
  onReassignSubname?: (subname: NamespaceTarget, owner: string, manager: string) => Promise<void>
  onRemoveSubname?: (subname: NamespaceTarget) => Promise<void>
  onTakeBackSubname?: (subname: NamespaceTarget) => Promise<void>
  canCreateSubname: boolean
  currentBlockHeight: number | null
  displayName: string
  error: string
  managedNameExpiresAt: number
  nowSeconds: number
  onCreateSubname: () => void
  onRecordTargetSelect: (subname: SubnameState) => void
  onSubnameExpiryDateChange: (value: string) => void
  onSubnameExpiryPolicyChange: (policy: SubnameExpiryPolicy) => void
  onSubnameLabelChange: (value: string) => void
  onSubnameManagerChange: (value: string) => void
  selectedAuthority: string
  subnameExpiryDate: string
  subnameExpiryPolicy: SubnameExpiryPolicy
  subnameLabel: string
  subnameManager: string
  subnames: SubnameState[]
  txState: DuskDomainTxState | null
}

export type SubdomainCreatePanelProps = Pick<
  SubdomainsViewProps,
  | 'canCreateSubname'
  | 'displayName'
  | 'onCreateSubname'
  | 'onSubnameExpiryDateChange'
  | 'onSubnameExpiryPolicyChange'
  | 'onSubnameLabelChange'
  | 'onSubnameManagerChange'
  | 'selectedAuthority'
  | 'subnameExpiryDate'
  | 'subnameExpiryPolicy'
  | 'subnameLabel'
  | 'subnameManager'
> & {
  parentExpiryDay: string
  subdomainPreview: string
}

export type SubdomainListProps = Pick<
  SubdomainsViewProps,
  | 'canControlSubname'
  | 'onReassignSubname'
  | 'onRemoveSubname'
  | 'onTakeBackSubname'
  | 'ownerAddresses'
  | 'selectedAuthority'
  | 'currentBlockHeight'
  | 'nowSeconds'
  | 'onRecordTargetSelect'
  | 'subnames'
>
