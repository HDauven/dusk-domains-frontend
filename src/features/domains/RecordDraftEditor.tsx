import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Shield, Wallet } from 'lucide-react'
import { useState } from 'react'
import { recordLabel } from './recordPresentation'
import {
  getRecordDefinition,
  type ResolverRecordKey,
} from '../../names/internal'
import {
  recordFreshnessCopy,
  recordPlaceholder,
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
              <label htmlFor={`record-draft-${key}`}>{recordLabel(key)}</label>
            </div>
            <div className="record-draft-control">
              <Input
                id={`record-draft-${key}`}
                aria-label={`${recordLabel(key)} record`}
                value={value}
                onChange={(event) => onDraftValueChange(key, event.target.value)}
                placeholder={recordPlaceholder(key)}
              />
              {walletAction === 'public' ? (
                <Button
                  className="record-wallet-button"
                  disabled={!walletAddressAvailable}
                  title={walletAddressAvailable ? 'Use connected Dusk public address' : 'Connect wallet first'}
                  type="button"
                  onClick={onUseWalletPublicAddress}
                >
                  <Wallet size={15} />
                  Use wallet
                </Button>
              ) : null}
              {walletAction === 'shielded' ? (
                <Button
                  className="record-wallet-button"
                  disabled={!walletAddressAvailable || shieldedBusy}
                  title={walletAddressAvailable ? 'Request shielded address from wallet' : 'Connect wallet first'}
                  type="button"
                  onClick={() => void handleShieldedAddress()}
                >
                  <Shield size={15} />
                  {shieldedBusy ? 'Waiting' : 'Use wallet'}
                </Button>
              ) : null}
            </div>
            <details className="record-draft-help"><summary>Advanced</summary><p>{recordFreshnessCopy(definition)}</p></details>
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
