import { Button } from '../../../components/ui/Button'
import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react'
import { abbreviate } from '../../../utils/format'
import {
  walletActionLabel,
  walletSetupActionCopy,
  walletSetupActionTitle,
  type WalletConnectionStatus,
} from '../../wallet/walletStatus'

export function RegistrationWalletSetupCard({
  installUrl,
  onOpenWalletConnection,
  onRefreshWalletProviders,
  selectedAddress,
  walletDiscoveryRefreshing,
  walletSetupState,
}: {
  installUrl: string
  onOpenWalletConnection: () => void
  onRefreshWalletProviders: () => Promise<unknown> | void
  selectedAddress: string
  walletDiscoveryRefreshing: boolean
  walletSetupState: WalletConnectionStatus
}) {
  const [showMissingWalletRetryHelp, setShowMissingWalletRetryHelp] = useState(false)
  const showMissingWalletRetryFailure = walletSetupState === 'missing' && !selectedAddress && showMissingWalletRetryHelp

  async function handleMissingWalletRetry() {
    setShowMissingWalletRetryHelp(false)
    try {
      await onRefreshWalletProviders()
    } finally {
      setShowMissingWalletRetryHelp(true)
    }
  }

  function handlePageReload() {
    if (typeof window !== 'undefined') window.location.reload()
  }

  return (
    <>
      {selectedAddress ? (
        <div className={walletSetupState === 'connected' ? 'register-wallet' : 'register-wallet blocked'}>
          {walletSetupState === 'connected' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <div>
            <strong>Owner wallet</strong>
            <code>{abbreviate(selectedAddress)}</code>
          </div>
        </div>
      ) : null}
      {/* A wallet on another network or locked still has an address; it cannot sign here yet. */}
      {walletSetupState !== 'connected' ? (
        <div className={`register-action ${walletSetupState}`}>
          <div className="register-action-copy">
            <strong>{walletSetupActionTitle(walletSetupState)}</strong>
            <span>{walletSetupActionCopy(walletSetupState)}</span>
          </div>
          {walletSetupState === 'missing' ? (
            <div className="register-wallet-actions">
              <a className="button button-primary compact" href={installUrl} target="_blank" rel="noreferrer">
                Install Dusk Wallet
                <ExternalLink size={16} />
              </a>
              <Button variant="quiet"

                disabled={walletDiscoveryRefreshing}
                type="button"
                onClick={() => void handleMissingWalletRetry()}
              >
                {walletDiscoveryRefreshing ? 'Checking...' : 'I installed it'}
              </Button>
              {showMissingWalletRetryFailure ? (
                <div className="register-wallet-help" role="status">
                  <span>Wallet still not detected. Reload this page after installing Dusk Wallet.</span>
                  <Button variant="quiet" type="button" onClick={handlePageReload}>
                    Reload page
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="register-wallet-actions">
              <Button variant="primary"
                className="compact"
                disabled={walletSetupState === 'detecting'}
                type="button"
                onClick={() => void onOpenWalletConnection()}
              >
                {walletActionLabel(walletSetupState)}
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </>
  )
}
