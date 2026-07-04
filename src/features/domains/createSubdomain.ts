import { contractPrincipalInput } from '../../app/appHelpers'
import { blockHeightFromDateInput } from './domainFormat'
import {
  coreCreateSubnameRuntimeCall,
  createSubnameState,
  currentUnixSeconds,
  userFacingErrorMessage,
} from '../../names/internal'
import { guardDomainActionPrerequisite } from './domainActionGuards'
import type { UseSubdomainActionsProps } from './subdomainActionTypes'

export async function createSubdomain({
  appendActivity,
  canCreateSubname,
  currentBlockHeight,
  displayName,
  managedNameExpiresAt,
  nowSeconds,
  runtimeConfig,
  selectedAddress,
  selectedAuthority,
  setCriticalRecordConfirmation,
  setDelegateManager,
  setDelegateSubnameNode,
  setPublicRecordAcknowledged,
  setRecordDrafts,
  setRecordError,
  setRecordTargetNode,
  setSubnameError,
  setSubnames,
  setSubnameTxState,
  shouldApplyPreviewWriteFallback,
  submitNameWrite,
  walletSetupState,
  subnameExpiryDate,
  subnameExpiryPolicy,
  subnameLabel,
  subnameManager,
  subnameResolver,
  subnameRevocationPolicy,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
}: UseSubdomainActionsProps) {
  setSubnameError('')
  if (!guardDomainActionPrerequisite({
    canContinue: Boolean(canCreateSubname && selectedAddress),
    setError: setSubnameError,
      walletSetupState,
    blockedCopy: 'Connect the parent owner wallet and enter a subdomain label before creating a subdomain.',
  })) {
    return
  }
  if (!ensureContractAuthorityForLiveWrite('create this subdomain', setSubnameError)) return
  if (!(await ensurePublicBalanceForLiveWrite('creating this subdomain', setSubnameError))) return

  try {
    const requestedExpiresAt = subnameExpiryPolicy === 'fixed_before_parent'
      ? blockHeightFromDateInput(subnameExpiryDate, currentBlockHeight, nowSeconds)
      : null
    const manager = contractPrincipalInput(subnameManager, 'Subdomain manager')
    const subname = createSubnameState({
      parentName: displayName,
      label: subnameLabel,
      owner: selectedAuthority,
      manager,
      resolver: subnameResolver.trim(),
      parentExpiresAt: managedNameExpiresAt,
      requestedExpiresAt,
      revocationPolicy: subnameRevocationPolicy,
      createdAt: currentUnixSeconds(),
    })
    const call = coreCreateSubnameRuntimeCall({
      parentNode: subname.parentNode,
      node: subname.node,
      parentName: subname.parentName,
      name: subname.name,
      label: subname.label,
      owner: subname.owner,
      manager: subname.manager,
      expiresAt: subname.expiresAt,
      expiryPolicy: subname.expiryPolicy,
      revocationPolicy: subname.revocationPolicy,
    })
    const finalState = await submitNameWrite(displayName, call, {
      contracts: runtimeConfig.contracts,
      onUpdate: setSubnameTxState,
    })

    if (finalState.status !== 'executed') return

    if (!(await shouldApplyPreviewWriteFallback(`${subname.name} creation`, async (client) => {
      const indexed = await client.getSubname(subname.node)
      return indexed?.name === subname.name && indexed.status === 'active'
    }))) return

    setSubnames((current) => [subname, ...current.filter((existing) => existing.node !== subname.node)])
    setRecordTargetNode(subname.node)
    setRecordDrafts({})
    setRecordError('')
    setPublicRecordAcknowledged(false)
    setCriticalRecordConfirmation('')
    setDelegateSubnameNode(subname.node)
    setDelegateManager(subname.manager)
    appendActivity({
      eventType: 'subname_created',
      actor: selectedAuthority,
      target: subname.manager,
      txId: finalState.txId,
      node: subname.node,
      name: subname.name,
    })
  } catch (error) {
    setSubnameError(userFacingErrorMessage(error))
  }
}
