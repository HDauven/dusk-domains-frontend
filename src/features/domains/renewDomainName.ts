import { safeNumber } from '../../names/numbers'
import {
  formatLifecycleDay,
  lifecycleHeightFromIndexed,
} from './domainFormat'
import {
  storeRenewRequest,
  renewalFeeLux,
  renewRegistrationLifecycle,
  userFacingErrorMessage,
} from '../../names/internal'
import { guardDomainActionPrerequisite } from './domainActionGuards'
import { canRenewOutsideEscrow } from '../../app/managedNameState'
import type { UseDomainSettingsActionsProps } from './domainSettingsActionTypes'

export async function renewDomainName({
  renewalQuote, renewalNameRef,
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
  if (managedName?.inMarketplaceEscrow) {
    setRenewalError('Close the marketplace listing before renewing this name.')
    return
  }
  if (managedName && !canRenewOutsideEscrow(managedName)) {
    setRenewalError('Renewal is unavailable until marketplace custody can be checked.')
    return
  }
  if (!guardDomainActionPrerequisite({
    canContinue: canRenewName,
    setError: setRenewalError,
      walletSetupState,
    blockedCopy: managedName?.ownerIsContract
      ? 'Connect a wallet to renew this name before its grace period ends.'
      : 'Connect the owner or manager wallet before renewing this name.',
  })) {
    return
  }
  if (!ensureContractAuthorityForLiveWrite('renew this name', setRenewalError)) return
  // The renewal schedule prices renewals; a registration price, which a policy replacement changes, never does.
  const feeLux = renewalQuote ? safeNumber(renewalQuote.total_lux) : renewalFeeLux(resultLabel, renewalYears, feeConfig ?? {})
  if (feeLux === null) {
    setRenewalError('The renewal price is unavailable right now. Try again in a moment.')
    return
  }
  if (!(await ensurePublicBalanceForLiveWrite(
    'renewing this name',
    message => { if (workspace()) setRenewalError(message) },
  ))) return

  if (!workspace()) return

  try {
    const lifecycle = renewalQuote ? {expiresAt:safeNumber(renewalQuote.new_expiry), graceEndsAt:safeNumber(renewalQuote.new_grace_end)} : renewRegistrationLifecycle({
      currentExpiresAt: managedName.expiresAt,
      now: lifecycleBaseBlockHeight,
      years: renewalYears,
    })
    const call = storeRenewRequest({
      node: nodeHex,
      durationYears: renewalYears,
      feeLux,
    })
    const finalState = await submitNameWrite(displayName, {...call, nameRef: renewalNameRef,expectedScheduleVersion:renewalQuote?.schedule_version}, {
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
