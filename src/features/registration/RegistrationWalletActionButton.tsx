import { ArrowRight, ExternalLink } from 'lucide-react'
import {
  walletActionLabel,
  walletActionTitle,
  type WalletConnectionStatus,
} from '../wallet/walletStatus'

export function RegistrationWalletActionButton({
  className,
  installUrl,
  onOpenWalletConnection,
  walletSetupState,
}: {
  className: string
  installUrl: string
  onOpenWalletConnection: () => void
  walletSetupState: WalletConnectionStatus
}) {
  if (walletSetupState === 'missing') {
    return (
      <a className={className} href={installUrl} target="_blank" rel="noreferrer">
        Install wallet
        <ExternalLink size={16} />
      </a>
    )
  }

  return (
    <button
      className={className}
      disabled={walletSetupState === 'detecting'}
      title={walletActionTitle(walletSetupState)}
      type="button"
      onClick={() => void onOpenWalletConnection()}
    >
      {walletActionLabel(walletSetupState)}
      <ArrowRight size={16} />
    </button>
  )
}
