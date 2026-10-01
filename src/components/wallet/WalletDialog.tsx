import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { AddressChip } from '../ui/AddressChip'
import { duskWalletInstallUrl } from '../../app/appConstants'
import { walletActionLabel, type WalletConnectionStatus } from '../../features/wallet/walletStatus'

export function WalletDialog({ open, busy, error, status, address, onClose, onConnect, onDisconnect, onReferrals }: {
  open: boolean
  busy: boolean
  error: string
  status: WalletConnectionStatus
  address: string
  onClose: () => void
  onConnect: () => void
  onDisconnect: () => void
  onReferrals: () => void
}) {
  const connected = status === 'connected'
  return <Dialog open={open} onClose={onClose} labelledBy="wallet-heading" loading={busy} className="wallet-dialog">
    <h2 id="wallet-heading">{connected ? 'Your wallet' : walletActionLabel(status)}</h2>
    {connected ? <AddressChip value={address} /> : <p>{busy ? 'Continue in Dusk Wallet.' : status === 'wrong-network' ? 'Switch your wallet to this app’s network.' : status === 'locked' ? 'Unlock your wallet to continue.' : 'Connect Dusk Wallet to manage your names.'}</p>}
    {error ? <p role="alert">{error}</p> : null}
    <div className="wallet-dialog-actions">
      {connected ? <>
        <Button disabled={busy} onClick={onReferrals}>Referrals</Button>
        <Button disabled={busy} onClick={onDisconnect}>Disconnect</Button>
      </> : <>
        {status === 'missing' ? <a className="button button-primary" href={duskWalletInstallUrl} target="_blank" rel="noreferrer">Install Dusk Wallet</a> : null}
        <Button variant="primary" disabled={busy} onClick={onConnect}>{busy ? 'Waiting for wallet…' : status === 'missing' ? 'Try again' : walletActionLabel(status)}</Button>
      </>}
      <Button variant="quiet" disabled={busy} onClick={onClose}>Close</Button>
    </div>
  </Dialog>
}
