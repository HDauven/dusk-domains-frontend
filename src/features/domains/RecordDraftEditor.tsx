import { Shield, Wallet } from 'lucide-react'
import { useState } from 'react'
import {
  getRecordDefinition,
  type ResolverRecordKey,
} from '../../names/internal'
import {
  recordFreshnessCopy,
  recordPlaceholder,
  recordVisibilityLabel,
} from './domainFormat'

export function RecordDraftEditor({
  editableRecordKeys,
  onDraftValueChange,
  onUseWalletPublicAddress,
  onUseWalletShieldedAddress,
  recordDraftValues,
  walletAddressAvailable,
}: {
  editableRecordKeys: readonly ResolverRecordKey[]
  onDraftValueChange: (key: ResolverRecordKey, value: string) => void
  onUseWalletPublicAddress: () => void
  onUseWalletShieldedAddress: () => Promise<void>
  recordDraftValues: Partial<Record<ResolverRecordKey, string>>
  walletAddressAvailable: boolean
}) {
  const [shieldedBusy, setShieldedBusy] = useState(false)

  const handleShieldedAddress = async () => {
    setShieldedBusy(true)
    try {
      await onUseWalletShieldedAddress()
    } finally {
      setShieldedBusy(false)
    }
  }

  return (
    <div className="record-batch-editor">
      {editableRecordKeys.map((key) => {
        const definition = getRecordDefinition(key)
        const value = recordDraftValues[key] ?? ''
        const walletAction = recordWalletAction(key)
        return (
          <div className="record-draft-row" key={key}>
            <div className="record-draft-label">
              <label htmlFor={`record-draft-${key}`}>{definition?.label ?? key}</label>
              <span>{recordVisibilityLabel(definition?.visibility)}</span>
            </div>
            <div className="record-draft-control">
              <input
                id={`record-draft-${key}`}
                aria-label={`${definition?.label ?? key} record`}
                value={value}
                onChange={(event) => onDraftValueChange(key, event.target.value)}
                placeholder={recordPlaceholder(key)}
              />
              {walletAction === 'public' ? (
                <button
                  className="record-wallet-button"
                  disabled={!walletAddressAvailable}
                  title={walletAddressAvailable ? 'Use connected Dusk public address' : 'Connect wallet first'}
                  type="button"
                  onClick={onUseWalletPublicAddress}
                >
                  <Wallet size={15} />
                  Use wallet
                </button>
              ) : null}
              {walletAction === 'shielded' ? (
                <button
                  className="record-wallet-button"
                  disabled={!walletAddressAvailable || shieldedBusy}
                  title={walletAddressAvailable ? 'Request shielded address from wallet' : 'Connect wallet first'}
                  type="button"
                  onClick={() => void handleShieldedAddress()}
                >
                  <Shield size={15} />
                  {shieldedBusy ? 'Waiting' : 'Use wallet'}
                </button>
              ) : null}
            </div>
            <span className="record-draft-help">{recordFreshnessCopy(definition)}</span>
          </div>
        )
      })}
    </div>
  )
}

function recordWalletAction(key: ResolverRecordKey) {
  if (key === 'moonlight_address') return 'public'
  if (key === 'phoenix_payment_endpoint') return 'shielded'
  return null
}
