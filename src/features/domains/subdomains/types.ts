import type { NamespaceTarget } from '../namespaceActions'
import type {
  DuskDomainTxState,
  SubnameExpiryPolicy,
  SubnameState,
} from '../../../names/internal'

export type SubdomainsViewProps = {
  displayName: string
  error: string
  managedNameExpiresAt: number
  onRecordTargetSelect: (subname: SubnameState) => void
  subnames: SubnameState[]
  txState: DuskDomainTxState | null
  authority: {
    ownerAddresses?: string[]
    canEdit?: boolean
    canControlSubname?: (subname: NamespaceTarget) => boolean
    onReassignSubname?: (subname: NamespaceTarget, owner: string, manager: string) => Promise<void>
    onRemoveSubname?: (subname: NamespaceTarget) => Promise<void>
    onTakeBackSubname?: (subname: NamespaceTarget) => Promise<void>
    selectedAuthority: string
  }
  creation: {
    canCreateSubname: boolean
    onCreateSubname: () => void
    onSubnameExpiryDateChange: (value: string) => void
    onSubnameExpiryPolicyChange: (policy: SubnameExpiryPolicy) => void
    onSubnameLabelChange: (value: string) => void
    onSubnameManagerChange: (value: string) => void
    subnameExpiryDate: string
    subnameExpiryPolicy: SubnameExpiryPolicy
    subnameLabel: string
    subnameManager: string
  }
  clock: {
    currentBlockHeight: number | null
    nowSeconds: number
  }
}

export type SubdomainCreatePanelProps = Pick<SubdomainsViewProps, 'displayName'> & {
  creation: Pick<SubdomainsViewProps['creation'], 'canCreateSubname' | 'onCreateSubname' | 'onSubnameExpiryDateChange' | 'onSubnameExpiryPolicyChange' | 'onSubnameLabelChange' | 'onSubnameManagerChange' | 'subnameExpiryDate' | 'subnameExpiryPolicy' | 'subnameLabel' | 'subnameManager'>
  authority: Pick<SubdomainsViewProps['authority'], 'selectedAuthority'>
} & {
  parentExpiryDay: string
  subdomainPreview: string
}

export type SubdomainListProps = Pick<SubdomainsViewProps, 'onRecordTargetSelect' | 'subnames'> & {
  authority: Pick<SubdomainsViewProps['authority'], 'canControlSubname' | 'onReassignSubname' | 'onRemoveSubname' | 'onTakeBackSubname' | 'ownerAddresses' | 'selectedAuthority'>
  clock: Pick<SubdomainsViewProps['clock'], 'currentBlockHeight' | 'nowSeconds'>
}
