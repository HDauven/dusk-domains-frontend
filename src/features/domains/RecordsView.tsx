import {
  type DuskNameTxState,
  type ResolverRecord,
  type ResolverRecordKey,
} from '../../names/internal'
import { CriticalRecordConfirmation } from './CriticalRecordConfirmation'
import { PublicRecordAcknowledgement } from './PublicRecordAcknowledgement'
import { RecordBatchActions } from './RecordBatchActions'
import { RecordDraftErrorNotice } from './RecordDraftErrorNotice'
import { RecordDraftEditor } from './RecordDraftEditor'
import { RecordsHeader } from './RecordsHeader'
import { RecordList } from './RecordList'
import { RecordTargetSelect } from './RecordTargetSelect'
import { ManagementFeedback } from './ManagementFeedback'
import type { RecordTargetOption } from './recordTypes'

export type { RecordTargetOption } from './recordTypes'

export function RecordsView({
  activeRecordTarget,
  canRemoveRecords,
  canSaveRecords,
  criticalRecordChange,
  criticalRecordConfirmation,
  displayName,
  editableRecordKeys,
  error,
  onBack,
  onClearRecord,
  onCriticalRecordConfirmationChange,
  onDraftValueChange,
  onPublicRecordAcknowledgedChange,
  onRecordTargetChange,
  onSaveRecords,
  onUseWalletPublicAddress,
  onUseWalletShieldedAddress,
  publicRecordAcknowledged,
  recordBusy,
  recordDraftErrors,
  recordDraftMutationCount,
  recordDraftValues,
  recordTargetOptions,
  resolverRecords,
  txState,
  walletAddressAvailable,
}: {
  activeRecordTarget: RecordTargetOption | undefined
  canRemoveRecords: boolean
  canSaveRecords: boolean
  criticalRecordChange: boolean
  criticalRecordConfirmation: string
  displayName: string
  editableRecordKeys: readonly ResolverRecordKey[]
  error: string
  onBack: () => void
  onClearRecord: (record: ResolverRecord) => void
  onCriticalRecordConfirmationChange: (value: string) => void
  onDraftValueChange: (key: ResolverRecordKey, value: string) => void
  onPublicRecordAcknowledgedChange: (checked: boolean) => void
  onRecordTargetChange: (node: string) => void
  onSaveRecords: () => void
  onUseWalletPublicAddress: () => void
  onUseWalletShieldedAddress: () => Promise<void>
  publicRecordAcknowledged: boolean
  recordBusy: boolean
  recordDraftErrors: string[]
  recordDraftMutationCount: number
  recordDraftValues: Partial<Record<ResolverRecordKey, string>>
  recordTargetOptions: RecordTargetOption[]
  resolverRecords: ResolverRecord[]
  txState: DuskNameTxState | null
  walletAddressAvailable: boolean
}) {
  const targetName = activeRecordTarget?.name ?? displayName

  return (
    <section className="records-panel" aria-labelledby="records-heading">
      <RecordsHeader displayName={displayName} onBack={onBack} />

      <RecordTargetSelect
        activeRecordTarget={activeRecordTarget}
        onRecordTargetChange={onRecordTargetChange}
        recordTargetOptions={recordTargetOptions}
      />

      <RecordDraftEditor
        editableRecordKeys={editableRecordKeys}
        onDraftValueChange={onDraftValueChange}
        onUseWalletPublicAddress={onUseWalletPublicAddress}
        onUseWalletShieldedAddress={onUseWalletShieldedAddress}
        recordDraftValues={recordDraftValues}
        walletAddressAvailable={walletAddressAvailable}
      />

      <PublicRecordAcknowledgement
        checked={publicRecordAcknowledged}
        onChange={onPublicRecordAcknowledgedChange}
      />

      <RecordBatchActions
        canSaveRecords={canSaveRecords}
        onSaveRecords={onSaveRecords}
        recordDraftMutationCount={recordDraftMutationCount}
      />

      {criticalRecordChange ? (
        <CriticalRecordConfirmation
          criticalRecordConfirmation={criticalRecordConfirmation}
          onCriticalRecordConfirmationChange={onCriticalRecordConfirmationChange}
          targetName={targetName}
        />
      ) : null}

      <RecordDraftErrorNotice errors={recordDraftErrors} />

      <RecordList
        canRemoveRecords={canRemoveRecords}
        onClearRecord={onClearRecord}
        recordBusy={recordBusy}
        resolverRecords={resolverRecords}
        targetName={targetName}
      />

      <ManagementFeedback error={error} txState={txState} />
    </section>
  )
}
