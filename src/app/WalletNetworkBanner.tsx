import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../components/ui/Button'
import type { WalletConnectionStatus } from '../features/wallet/walletStatus'
import { walletNetworkMismatch, type NetworkSites } from './otherNetwork'
import { usePageLocation } from './pageLocation'

/**
 * Says when the connected wallet is on another network than this site's. It offers the same page
 * on the other network's site and the wallet switch the app asks for before signing. It never
 * redirects, and the page shows the same either way.
 */
export function WalletNetworkBanner({ sites, walletChainId, walletStatus, onSwitchWallet }: {
  sites: NetworkSites
  walletChainId: string | null | undefined
  walletStatus: WalletConnectionStatus
  onSwitchWallet: () => void
}) {
  const page = usePageLocation()
  const mismatch = walletNetworkMismatch({ sites, page, walletChainId, walletStatus })
  // Dismissed for the wallet's network; it shows again when the wallet moves to another.
  const [dismissed, setDismissed] = useState<string | null>(null)
  if (!mismatch) {
    if (dismissed !== null) setDismissed(null)
    return null
  }
  if (dismissed === mismatch.walletChainId) return null
  return (
    <section className="wallet-network-banner" aria-label="Wallet network">
      <div className="wallet-network-content">
        <p role="status">{mismatch.walletNetwork ? `Your wallet is on ${mismatch.walletNetwork}.` : 'Your wallet is on a different network.'}</p>
        <div className="wallet-network-actions">
          {mismatch.otherSite ? <a className="button button-secondary compact" href={mismatch.otherSite.href}>Open {mismatch.otherSite.host}</a> : null}
          <Button className="compact" onClick={onSwitchWallet}>Switch wallet to {mismatch.siteNetwork}</Button>
        </div>
      </div>
      <Button variant="quiet" className="icon-button wallet-network-dismiss" aria-label="Dismiss" onClick={() => setDismissed(mismatch.walletChainId)}>
        <X size={18} aria-hidden="true" />
      </Button>
    </section>
  )
}
