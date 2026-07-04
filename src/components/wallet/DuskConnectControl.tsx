import type { DuskWalletState } from '../../names/internal'
import { walletActionLabel, walletActionTitle, type WalletConnectionStatus } from '../../features/wallet/walletStatus'
import { abbreviate } from '../../utils/format'

export function DuskConnectControl({
  onOpen,
  state,
  status,
}: {
  onOpen: () => void
  state: DuskWalletState
  status: WalletConnectionStatus
}) {
  const selectedAccount = status === 'connected' || status === 'wrong-network'
    ? state.selectedAddress ?? state.accounts[0] ?? ''
    : ''
  const label = status === 'wrong-network'
    ? walletActionLabel(status)
    : status === 'connected' && selectedAccount
      ? abbreviate(selectedAccount)
      : walletActionLabel(status)
  const className = status === 'connected'
    ? 'wallet-connect connected'
    : status === 'locked' || status === 'disconnected'
      ? 'wallet-connect needs-unlock'
      : status === 'wrong-network'
        ? 'wallet-connect wrong-network'
        : 'wallet-connect'

  return (
    <button
      className={className}
      title={status === 'wrong-network' ? walletActionTitle(status) : selectedAccount || walletActionTitle(status)}
      type="button"
      onClick={onOpen}
    >
      {label}
    </button>
  )
}
