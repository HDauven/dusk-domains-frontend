import { useMemo, useState } from 'react'
import type {
  DuskNameTxState,
  SubnameExpiryPolicy,
  SubnameRevocationPolicy,
  SubnameState,
} from '../names/internal'
import {
  createManagedNameState,
  fallbackManager,
  fallbackOwner,
} from './appHelpers'

export function useDomainManagementAppState(recordSourceContractId: string) {
  const [renewalYears, setRenewalYears] = useState(1)
  const [managementTxState, setManagementTxState] = useState<DuskNameTxState | null>(null)
  const [renewalTxState, setRenewalTxState] = useState<DuskNameTxState | null>(null)
  const [recordTxState, setRecordTxState] = useState<DuskNameTxState | null>(null)
  const [primaryTxState, setPrimaryTxState] = useState<DuskNameTxState | null>(null)
  const [subnameTxState, setSubnameTxState] = useState<DuskNameTxState | null>(null)
  const [managementError, setManagementError] = useState('')
  const [renewalError, setRenewalError] = useState('')
  const [recordError, setRecordError] = useState('')
  const [primaryError, setPrimaryError] = useState('')
  const [subnameError, setSubnameError] = useState('')
  const [confirmationInput, setConfirmationInput] = useState('')
  const [primaryEndpointValue, setPrimaryEndpointValue] = useState('')
  const [primaryName, setPrimaryName] = useState<string | null>(null)
  const [subnameLabel, setSubnameLabel] = useState('settlement')
  const [subnameManager, setSubnameManager] = useState(fallbackManager)
  const [subnameResolver, setSubnameResolver] = useState(recordSourceContractId)
  const [subnameExpiryPolicy, setSubnameExpiryPolicy] = useState<SubnameExpiryPolicy>('inherits_parent')
  const [subnameExpiryDate, setSubnameExpiryDate] = useState('')
  const [subnameRevocationPolicy, setSubnameRevocationPolicy] = useState<SubnameRevocationPolicy>('parent_revocable')
  const [subnames, setSubnames] = useState<SubnameState[]>([])
  const [delegateSubnameNode, setDelegateSubnameNode] = useState('')
  const [delegateManager, setDelegateManager] = useState('')
  const [managedName, setManagedName] = useState(() => createManagedNameState(recordSourceContractId))
  const [draftOwner, setDraftOwner] = useState(fallbackOwner)
  const [draftManager, setDraftManager] = useState(fallbackManager)
  const [draftResolver, setDraftResolver] = useState(recordSourceContractId)
  const activeSubnames = useMemo(() => (
    subnames.filter((subname) => subname.status === 'active')
  ), [subnames])

  return {
    activeSubnames,
    confirmationInput,
    delegateManager,
    delegateSubnameNode,
    draftManager,
    draftOwner,
    draftResolver,
    managedName,
    managementError,
    managementTxState,
    primaryEndpointValue,
    primaryError,
    primaryName,
    primaryTxState,
    recordError,
    recordTxState,
    renewalError,
    renewalTxState,
    renewalYears,
    setConfirmationInput,
    setDelegateManager,
    setDelegateSubnameNode,
    setDraftManager,
    setDraftOwner,
    setDraftResolver,
    setManagedName,
    setManagementError,
    setManagementTxState,
    setPrimaryEndpointValue,
    setPrimaryError,
    setPrimaryName,
    setPrimaryTxState,
    setRecordError,
    setRecordTxState,
    setRenewalError,
    setRenewalTxState,
    setRenewalYears,
    setSubnameError,
    setSubnameExpiryDate,
    setSubnameExpiryPolicy,
    setSubnameLabel,
    setSubnameManager,
    setSubnameResolver,
    setSubnameRevocationPolicy,
    setSubnames,
    setSubnameTxState,
    subnameError,
    subnameExpiryDate,
    subnameExpiryPolicy,
    subnameLabel,
    subnameManager,
    subnameResolver,
    subnameRevocationPolicy,
    subnames,
    subnameTxState,
  }
}
