import { CheckCircle2, ExternalLink, Info, RefreshCw } from 'lucide-react'
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
  onRefreshWalletProviders: () => void
  selectedAddress: string
  walletDiscoveryRefreshing: boolean
  walletSetupState: WalletConnectionStatus
}) {
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
          <div className="wallet-setup-actions">
            {walletSetupState === 'missing' ? (
              <a className="commit-button wallet-install-button" href={installUrl} target="_blank" rel="noreferrer">
                Install wallet
                <ExternalLink size={16} />
              </a>
            ) : (
              <button
                className="commit-button wallet-install-button"
                disabled={walletSetupState === 'detecting'}
                type="button"
                onClick={() => void onOpenWalletConnection()}
              >
                {walletActionLabel(walletSetupState)}
              </button>
            )}
            <button
              aria-label="Check for Dusk wallet again"
              className="icon-button soft"
              disabled={walletDiscoveryRefreshing}
              type="button"
              onClick={() => void onRefreshWalletProviders()}
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
