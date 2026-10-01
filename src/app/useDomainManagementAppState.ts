import { useMemo, useState } from 'react'
import type {
  DuskDomainTxState,
  SubnameExpiryPolicy,
  SubnameState,
  DuskDomainsIndexerClient,
  DuskDomainsOnChainClient,
} from '../names/internal'
import {
  createManagedNameState,
} from './appHelpers'
import { createOwnershipConfirmation, type PendingOwnership } from './ownershipConfirmation'

export function useDomainManagementAppState(recordSourceContractId: string, indexerClient: DuskDomainsIndexerClient | null, onChainClient: DuskDomainsOnChainClient | null) {
  const [renewalYears, setRenewalYears] = useState(1)
  const [managementTxState, setManagementTxState] = useState<DuskDomainTxState | null>(null)
  const [renewalTxState, setRenewalTxState] = useState<DuskDomainTxState | null>(null)
  const [recordTxState, setRecordTxState] = useState<DuskDomainTxState | null>(null)
  const [primaryTxState, setPrimaryTxState] = useState<DuskDomainTxState | null>(null)
  const [subnameTxState, setSubnameTxState] = useState<DuskDomainTxState | null>(null)
  const [managementError, setManagementError] = useState('')
  const [renewalError, setRenewalError] = useState('')
  const [recordError, setRecordError] = useState('')
  const [primaryError, setPrimaryError] = useState('')
  const [subnameError, setSubnameError] = useState('')
  const [confirmationInput, setConfirmationInput] = useState('')
  const [primaryEndpointValue, setPrimaryEndpointValue] = useState('')
  const [primaryName, setPrimaryName] = useState<string | null>(null)
  const [subnameLabel, setSubnameLabel] = useState('settlement')
  const [subnameManager, setSubnameManager] = useState('')
  const [subnameExpiryPolicy, setSubnameExpiryPolicy] = useState<SubnameExpiryPolicy>('inherits_parent')
  const [subnameExpiryDate, setSubnameExpiryDate] = useState('')
  const [subnames, setSubnames] = useState<SubnameState[]>([])
  const [managedName, setManagedName] = useState(() => createManagedNameState(recordSourceContractId))
  const [pendingOwnership, setPendingOwnership] = useState<PendingOwnership[]>([])
  const ownership = useMemo(() => createOwnershipConfirmation({ indexerClient, onChainClient, setManagedName, setPending: setPendingOwnership }), [indexerClient, onChainClient])
  const activeSubnames = useMemo(() => (
    subnames.filter((subname) => subname.status === 'active')
  ), [subnames])

  return {
    beginOwnershipRead: ownership.beginRead,
    confirmOwnershipWrite: ownership.afterWrite,
    pendingOwnership,
    retryOwnershipConfirmation: ownership.retry,
    activeSubnames,
    confirmationInput,
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
    setManagedName: ownership.setManagedName,
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
    setSubnames,
    setSubnameTxState,
    subnameError,
    subnameExpiryDate,
    subnameExpiryPolicy,
    subnameLabel,
    subnameManager,
    subnames,
    subnameTxState,
  }
}
