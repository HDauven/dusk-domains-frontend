import {
  formatLifecycleDay,
  lifecycleHeightFromIndexed,
} from './domainFormat'
import {
  coreRenewRuntimeCall,
  registrationFeeLux,
  renewRegistrationLifecycle,
  userFacingErrorMessage,
} from '../../names/internal'
import { guardDomainActionPrerequisite } from './domainActionGuards'
import type { UseDomainSettingsActionsProps } from './domainSettingsActionTypes'

export async function renewDomainName({
  appendActivity,
  canRenewName,
  currentBlockHeight,
  displayName,
  feeConfig,
  lifecycleBaseBlockHeight,
  managedName,
  nodeHex,
  nowSeconds,
  renewalYears,
  resultLabel,
  runtimeConfig,
  selectedAuthority,
  setManagedName,
  setRenewalError,
  setRenewalTxState,
  shouldApplyPreviewWriteFallback,
  submitNameWrite,
  walletSetupState,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
}: UseDomainSettingsActionsProps) {
  const workspace = submitNameWrite.captureWorkspace(displayName)
  setRenewalError('')
  if (!guardDomainActionPrerequisite({
    canContinue: canRenewName,
    setError: setRenewalError,
      walletSetupState,
    blockedCopy: 'Connect the owner or manager wallet before renewing this name.',
  })) {
    return
  }
  if (!ensureContractAuthorityForLiveWrite('renew this name', setRenewalError)) return
  const feeLux = registrationFeeLux(resultLabel, renewalYears, feeConfig)
  if (!(await ensurePublicBalanceForLiveWrite(
    'renewing this name',
    message => { if (workspace()) setRenewalError(message) },
    1,
    BigInt(feeLux),
  ))) return

  if (!workspace()) return

  try {
    const lifecycle = renewRegistrationLifecycle({
      currentExpiresAt: managedName.expiresAt,
      now: lifecycleBaseBlockHeight,
      years: renewalYears,
    })
    const call = coreRenewRuntimeCall({
      node: nodeHex,
      durationYears: renewalYears,
      feeLux,
    })
    const finalState = await submitNameWrite(displayName, call, {
      workspace,
      contracts: runtimeConfig.contracts,
      onUpdate: setRenewalTxState,
    })
    if (!workspace()) return

    if (finalState.status !== 'executed') return

    if (!(await shouldApplyPreviewWriteFallback('renewal', async (client) => {
      const indexed = await client.getNameState(nodeHex)
      return lifecycleHeightFromIndexed(
        indexed?.expiresAt,
        indexed?.expiresAtBlockHeight,
        currentBlockHeight,
        nowSeconds,
      ) === lifecycle.expiresAt
    }, workspace))) return
    if (!workspace()) return

    setManagedName((current) => ({
      ...current,
      expiresAt: lifecycle.expiresAt,
      graceEndsAt: lifecycle.graceEndsAt,
    }))
    appendActivity({
      eventType: 'renewal',
      actor: selectedAuthority,
      target: formatLifecycleDay(lifecycle.expiresAt, currentBlockHeight, nowSeconds),
      txId: finalState.txId,
    })
  } catch (error) {
    if (!workspace()) return
    setRenewalError(userFacingErrorMessage(error))
  }
}
