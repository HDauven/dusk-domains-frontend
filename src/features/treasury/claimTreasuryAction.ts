import {
  treasuryClaimAllRuntimeCall,
  treasuryClaimRuntimeCall,
  userFacingMessageFromText,
  waitForConfirmedIndexerRefresh,
} from '../../names/internal'
import type { UseTreasuryActionsProps } from './treasuryActionTypes'

export async function claimTreasury(
  {
    connectedAsTreasuryOperator,
    indexerClient,
    liveDuskNamesApp,
    loadTreasury,
    resetTreasuryClaimAmount,
    runtimeConfig,
    selectedAddress,
    setTreasuryConfirmation,
    setTreasuryError,
    setTreasuryTxState,
    submitNameWrite,
    treasuryAvailable,
    treasuryBusy,
    treasuryClaimAmountError,
    treasuryClaimAmountLux,
    treasuryState,
    ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite,
  }: UseTreasuryActionsProps,
  mode: 'all' | 'partial',
) {
  if (!treasuryAvailable || treasuryBusy) return

  setTreasuryError('')
  setTreasuryConfirmation('')
  if (!selectedAddress) {
    setTreasuryError('Connect the operator wallet first.')
    return
  }
  if (!connectedAsTreasuryOperator) {
    setTreasuryError('This wallet is not the treasury operator.')
    return
  }
  if (!liveDuskNamesApp) {
    setTreasuryError('Connect a transaction-capable wallet to claim.')
    return
  }
  const amountLux = mode === 'partial' ? treasuryClaimAmountLux : treasuryState.availableLux
  if (!amountLux || amountLux <= 0) {
    setTreasuryError(treasuryClaimAmountError || 'Enter an amount to claim.')
    return
  }
  if (amountLux > treasuryState.availableLux) {
    setTreasuryError('Amount exceeds available balance.')
    return
  }
  if (!ensureContractAuthorityForLiveWrite('claim treasury funds', setTreasuryError)) return
  if (!(await ensurePublicBalanceForLiveWrite('claiming treasury funds', setTreasuryError))) return

  const beforeAvailableLux = treasuryState.availableLux
  const call = mode === 'partial'
    ? treasuryClaimRuntimeCall({ amountLux })
    : treasuryClaimAllRuntimeCall()
  const finalState = await submitNameWrite('treasury.dusk', call, {
    contracts: runtimeConfig.contracts,
    onUpdate: setTreasuryTxState,
  })

  if (finalState.status !== 'executed') {
    setTreasuryError(finalState.message ? userFacingMessageFromText(finalState.message) : 'Treasury claim was not completed.')
    return
  }

  if (!indexerClient) {
    setTreasuryConfirmation('Claim submitted. Treasury data will refresh when available.')
    return
  }

  setTreasuryConfirmation('Waiting for treasury confirmation.')
  const confirmation = await waitForConfirmedIndexerRefresh({
    description: 'treasury claim',
    attempts: 15,
    delayMs: 1_000,
    check: async () => {
      const nextTreasury = await indexerClient.getTreasury()
      return nextTreasury.availableLux < beforeAvailableLux || nextTreasury.lastEventType === 'treasury_claimed'
    },
    refresh: loadTreasury,
  })

  if (confirmation.confirmed && confirmation.refreshed) {
    setTreasuryConfirmation('Treasury claim confirmed.')
    resetTreasuryClaimAmount()
    return
  }

  setTreasuryConfirmation('')
  setTreasuryError(confirmation.error
    ? `Claim submitted, but treasury data is still syncing: ${userFacingMessageFromText(confirmation.error)}`
    : 'Claim submitted, but treasury data is still syncing.')
}
