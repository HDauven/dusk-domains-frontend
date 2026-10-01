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
  setRecordDrafts,
  setRecordError,
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
  recordSourceContractId,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
}: UseSubdomainActionsProps) {
  setSubnameError('')
  if (!guardDomainActionPrerequisite({
    canContinue: Boolean(canCreateSubname && selectedAddress),
    setError: setSubnameError,
      walletSetupState,
    blockedCopy: 'Connect the parent owner wallet and enter a subname label before creating a subname.',
  })) {
    return
  }
  if (!ensureContractAuthorityForLiveWrite('create this subname', setSubnameError)) return
  if (!(await ensurePublicBalanceForLiveWrite('creating this subname', setSubnameError))) return

  try {
    const requestedExpiresAt = subnameExpiryPolicy === 'fixed_before_parent'
      ? blockHeightFromDateInput(subnameExpiryDate, currentBlockHeight, nowSeconds)
      : null
    const manager = contractPrincipalInput(subnameManager.trim() || selectedAuthority, 'Subname manager')
    const subname = createSubnameState({
      parentName: displayName,
      label: subnameLabel,
      owner: selectedAuthority,
      manager,
      resolver: recordSourceContractId.trim(),
      parentExpiresAt: managedNameExpiresAt,
      requestedExpiresAt,
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
    setRecordDrafts({})
    setRecordError('')
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
