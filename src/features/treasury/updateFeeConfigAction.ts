import {
  coreSetFeeConfigRuntimeCall,
  userFacingMessageFromText,
  waitForConfirmedIndexerRefresh,
} from '../../names/internal'
import {
  feeConfigValuesMatch,
  parseFeeConfigForm,
} from './feeConfig'
import type { UseTreasuryActionsProps } from './treasuryActionTypes'

export async function updateFeeConfig({
  connectedAsTreasuryOperator,
  feeConfig,
  feeConfigBusy,
  feeConfigForm,
  indexerClient,
  liveDuskDomainsApp,
  loadFeeConfig,
  runtimeConfig,
  selectedAddress,
  setFeeConfigConfirmation,
  setFeeConfigTxState,
  setFeeConfigUpdateError,
  submitNameWrite,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
}: UseTreasuryActionsProps) {
  if (feeConfigBusy) return

  setFeeConfigUpdateError('')
  setFeeConfigConfirmation('')

  if (!selectedAddress) {
    setFeeConfigUpdateError('Connect the operator wallet first.')
    return
  }
  if (!connectedAsTreasuryOperator) {
    setFeeConfigUpdateError('This wallet is not the operator.')
    return
  }
  if (!liveDuskDomainsApp) {
    setFeeConfigUpdateError('Connect a transaction-capable wallet to update pricing.')
    return
  }

  const parsed = parseFeeConfigForm(feeConfigForm)
  if (!parsed.ok) {
    setFeeConfigUpdateError(parsed.error)
    return
  }
  if (feeConfigValuesMatch(feeConfig, parsed.config)) {
    setFeeConfigUpdateError('No pricing changes to save.')
    return
  }

  if (!ensureContractAuthorityForLiveWrite('update pricing', setFeeConfigUpdateError)) return
  if (!(await ensurePublicBalanceForLiveWrite('updating pricing', setFeeConfigUpdateError))) return

  const finalState = await submitNameWrite('pricing.dusk', coreSetFeeConfigRuntimeCall(parsed.config), {
    contracts: runtimeConfig.contracts,
    onUpdate: setFeeConfigTxState,
  })

  if (finalState.status !== 'executed') {
    setFeeConfigUpdateError(finalState.message ? userFacingMessageFromText(finalState.message) : 'Pricing update was not completed.')
    return
  }

  if (!indexerClient) {
    setFeeConfigConfirmation('Pricing update submitted. Refresh when indexing is available.')
    return
  }

  setFeeConfigConfirmation('Waiting for pricing confirmation.')
  const confirmation = await waitForConfirmedIndexerRefresh({
    description: 'pricing update',
    attempts: 15,
    delayMs: 1_000,
    check: async () => {
      const nextFeeConfig = await indexerClient.getFeeConfig()
      return feeConfigValuesMatch(nextFeeConfig, parsed.config)
    },
    refresh: loadFeeConfig,
  })

  if (confirmation.confirmed && confirmation.refreshed) {
    setFeeConfigConfirmation('Pricing updated.')
    return
  }

  setFeeConfigConfirmation('')
  setFeeConfigUpdateError(confirmation.error
    ? `Pricing update submitted, but pricing data is still syncing: ${userFacingMessageFromText(confirmation.error)}`
    : 'Pricing update submitted, but pricing data is still syncing.')
}
