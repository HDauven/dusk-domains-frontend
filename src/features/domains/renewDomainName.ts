import { exactNumber, safeNumber } from '../../names/numbers'
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
import { sameAuthority } from '../identity/ownerLabel'
import type { UseDomainSettingsActionsProps } from './domainSettingsActionTypes'

export async function renewDomainName({
  renewalQuote, renewalNameRef, renewalListing = null,
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
  // A listed name can be renewed too: the renewal leaves its listing, escrow and records as they are.
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
  // Someone else's name is renewed only as reviewed: its owner and, if listed, the listing it is
  // renewed by. Preparation reads both again before the wallet is asked.
  const holder = [managedName.owner, managedName.manager].some(authority => sameAuthority(authority, selectedAuthority))
  if (!holder && managedName.inMarketplaceEscrow && !renewalListing) {
    setRenewalError('This name’s listing can’t be read right now. Try again in a moment.')
    return
  }
  const reviewedRenewal = holder ? undefined : { owner: managedName.owner, listing: renewalListing }
  // The renewal schedule prices renewals; a registration price, which a policy replacement changes, never does.
  // A write carries the price as an exact number, so a larger quote is refused with a reason.
  const feeLux = renewalQuote ? exactNumber(renewalQuote.total_lux) : renewalFeeLux(resultLabel, renewalYears, feeConfig ?? {})
  if (renewalQuote && feeLux === null) {
    setRenewalError('This renewal’s price is higher than this site can handle.')
    return
  }
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
    const finalState = await submitNameWrite(displayName, {...call, nameRef: renewalNameRef, expectedScheduleVersion: renewalQuote?.schedule_version, ...(reviewedRenewal ? { reviewedRenewal } : {})}, {
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
