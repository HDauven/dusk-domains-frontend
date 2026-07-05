import { useState } from 'react'
import { CheckCircle2, ExternalLink, Info } from 'lucide-react'
import {
  walletActionLabel,
  walletSetupActionCopy,
  walletSetupActionTitle,
  walletSetupValueCopy,
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
      <div className={walletSetupState === 'connected' ? 'setup-row ready wallet-setup-card' : `setup-row wallet-setup-card ${walletSetupState}`}>
        <div>
          <strong>Wallet</strong>
          <span>{walletSetupValueCopy(walletSetupState, selectedAddress)}</span>
        </div>
        {selectedAddress ? <CheckCircle2 size={17} /> : <Info size={17} />}
      </div>
      {!selectedAddress ? (
        <div className={`wallet-setup-action ${walletSetupState}`}>
          <div>
            <strong>{walletSetupActionTitle(walletSetupState)}</strong>
            <span>{walletSetupActionCopy(walletSetupState)}</span>
          </div>
          {walletSetupState === 'missing' ? (
            <div className="wallet-setup-actions wallet-setup-actions-stacked">
              <a className="commit-button wallet-install-button" href={installUrl} target="_blank" rel="noreferrer">
                Install Dusk Wallet
                <ExternalLink size={16} />
              </a>
              <button
                className="wallet-retry-button"
                disabled={walletDiscoveryRefreshing}
                type="button"
                onClick={() => void handleMissingWalletRetry()}
              >
                {walletDiscoveryRefreshing ? 'Checking...' : 'I installed it'}
              </button>
              {showMissingWalletRetryFailure ? (
                <div className="wallet-install-help" role="status">
                  <span>Wallet still not detected. Reload this page after installing Dusk Wallet.</span>
                  <button type="button" onClick={handlePageReload}>
                    Reload page
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="wallet-setup-actions">
              <button
                className="commit-button wallet-install-button"
                disabled={walletSetupState === 'detecting'}
                type="button"
                onClick={() => void onOpenWalletConnection()}
              >
                {walletActionLabel(walletSetupState)}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </>
  )
}
