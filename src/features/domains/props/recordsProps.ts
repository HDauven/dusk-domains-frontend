import type {
  DomainManagementFeatureProps,
  UseDomainManagementFeatureProps,
} from '../domainManagementFeatureTypes'
import type { AsyncAction, ClearRecordAction } from './types'

type RecordsPropsArgs = Pick<
  UseDomainManagementFeatureProps,
  | 'activeRecordTarget'
  | 'canRemoveRecords'
  | 'canSaveRecords'
  | 'criticalRecordChange'
  | 'criticalRecordConfirmation'
  | 'displayName'
  | 'editableRecordKeys'
  | 'onBackToDetails'
  | 'publicRecordAcknowledged'
  | 'recordBusy'
  | 'recordDraftErrors'
  | 'recordDraftMutations'
  | 'recordDraftValues'
  | 'recordError'
  | 'recordTargetOptions'
  | 'recordTxState'
  | 'requestSelectedShieldedAddress'
  | 'resolverRecords'
  | 'selectedAddress'
  | 'setCriticalRecordConfirmation'
  | 'setPublicRecordAcknowledged'
  | 'setRecordDrafts'
  | 'setRecordError'
  | 'setRecordTargetNode'
> & {
  handleRecordClear: ClearRecordAction
  handleRecordsSave: AsyncAction
}

export function buildRecordsProps({
  activeRecordTarget,
  canRemoveRecords,
  canSaveRecords,
  criticalRecordChange,
  criticalRecordConfirmation,
  displayName,
  editableRecordKeys,
  handleRecordClear,
  handleRecordsSave,
  onBackToDetails,
  publicRecordAcknowledged,
  recordBusy,
  recordDraftErrors,
  recordDraftMutations,
  recordDraftValues,
  recordError,
  recordTargetOptions,
  recordTxState,
  requestSelectedShieldedAddress,
  resolverRecords,
  selectedAddress,
  setCriticalRecordConfirmation,
  setPublicRecordAcknowledged,
  setRecordDrafts,
  setRecordError,
  setRecordTargetNode,
}: RecordsPropsArgs): DomainManagementFeatureProps['recordsProps'] {
  return {
    activeRecordTarget,
    canRemoveRecords,
    canSaveRecords,
    criticalRecordChange,
    criticalRecordConfirmation,
    displayName,
    editableRecordKeys,
    error: recordError,
    onBack: onBackToDetails,
    onClearRecord: (record) => void handleRecordClear(record),
    onCriticalRecordConfirmationChange: setCriticalRecordConfirmation,
    onDraftValueChange: (key, value) => {
      setRecordDrafts((current) => ({
        ...current,
        [key]: value,
      }))
      setRecordError('')
    },
    onPublicRecordAcknowledgedChange: setPublicRecordAcknowledged,
    onRecordTargetChange: (node) => {
      setRecordTargetNode(node)
      setRecordError('')
      setRecordDrafts({})
      setPublicRecordAcknowledged(false)
      setCriticalRecordConfirmation('')
    },
    onSaveRecords: () => void handleRecordsSave(),
    onUseWalletPublicAddress: () => {
      setRecordDrafts((current) => ({
        ...current,
        moonlight_address: selectedAddress,
      }))
      setRecordError('')
    },
    onUseWalletShieldedAddress: async () => {
      setRecordError('')
      try {
        const shieldedAddress = await requestSelectedShieldedAddress()
        setRecordDrafts((current) => ({
          ...current,
          phoenix_payment_endpoint: shieldedAddress,
        }))
      } catch (error) {
        setRecordError(error instanceof Error ? error.message : 'Could not get shielded address from wallet.')
      }
    },
    publicRecordAcknowledged,
    recordBusy,
    recordDraftErrors,
    recordDraftMutationCount: recordDraftMutations.length,
    recordDraftValues,
    recordTargetOptions,
    resolverRecords,
    txState: recordTxState,
    walletAddressAvailable: Boolean(selectedAddress),
  }
}
