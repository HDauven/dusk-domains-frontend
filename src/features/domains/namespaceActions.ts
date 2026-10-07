import { canManageActiveName, canControlThroughAncestor } from '../../app/derived/managementCapabilities'
import { contractPrincipalInput } from '../../app/principalInput'
import { storeReassignSubnameRequest, storeRemoveSubnameRequest, userFacingErrorMessage, type SubnameState } from '../../names/internal'
import type { UseSubdomainActionsProps } from './subdomainActionTypes'

export type NamespaceTarget = Pick<SubnameState, 'node' | 'name' | 'parentNode'>

export function canControlSubname(props: Pick<UseSubdomainActionsProps, 'managedName' | 'subnames' | 'selectedAuthority' | 'currentBlockHeight'>, subname: NamespaceTarget) {
  const { managedName, selectedAuthority, currentBlockHeight } = props
  if (subname.node === managedName?.node) return canControlThroughAncestor(managedName, selectedAuthority, currentBlockHeight)
  let parentNode = subname.parentNode
  for (let depth = 0; depth < 3; depth++) {
    if (parentNode === managedName?.node) return canManageActiveName(managedName, selectedAuthority, currentBlockHeight) || canControlThroughAncestor(managedName, selectedAuthority, currentBlockHeight)
    const parent = props.subnames?.find(candidate => candidate.node === parentNode)
    if (!parent) return false
    if (canManageActiveName(parent, selectedAuthority, currentBlockHeight)) return true
    parentNode = parent.parentNode
  }
  return false
}

export async function writeSubnameAuthority(props: UseSubdomainActionsProps, subname: NamespaceTarget, authorities?: { owner: string; manager: string } | 'take_back') {
  const workspace = props.submitNameWrite.captureWorkspace(props.displayName)
  props.setSubnameError('')
  if (!canControlSubname(props, subname)) {
    props.setSubnameError('Connect the owner or manager of an active ancestor.')
    return
  }
  if (!props.ensureContractAuthorityForLiveWrite('manage this subname', props.setSubnameError)) return
  if (!await props.ensurePublicBalanceForLiveWrite('managing this subname', message => { if (workspace()) props.setSubnameError(message) })) return
  if (!workspace()) return
  try {
    const reassignment = authorities ? { node: subname.node,
      clearRecords: true,
      owner: authorities === 'take_back' ? props.selectedAuthority : contractPrincipalInput(authorities.owner, 'Owner'),
      manager: authorities === 'take_back' ? props.selectedAuthority : contractPrincipalInput(authorities.manager, 'Manager'),
    } : null
    const call = reassignment ? storeReassignSubnameRequest(reassignment)
      : storeRemoveSubnameRequest({ node: subname.node })
    const result = await props.submitNameWrite(subname.name, call, {
      workspace, contracts: props.runtimeConfig.contracts, onUpdate: props.setSubnameTxState,
    })
    if (!workspace() || result.status !== 'executed') return
    await props.shouldApplyPreviewWriteFallback(`${subname.name} update`, async client => {
      const state = await client.getNameState(props.managedName?.node ?? subname.parentNode)
      const indexed = subname.node === props.managedName?.node ? state
        : state?.namespace?.subnames.find(name => name.node === subname.node)
      if (subname.node !== props.managedName?.node && !state?.namespace) return false
      return authorities ? indexed?.owner === reassignment?.owner && indexed?.manager === reassignment?.manager : !indexed
    }, workspace)
  } catch (error) {
    if (workspace()) props.setSubnameError(userFacingErrorMessage(error))
  }
}
