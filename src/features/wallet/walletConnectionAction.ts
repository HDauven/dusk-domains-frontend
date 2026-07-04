import type { DuskConnectOptions } from '../../names/internal'
import type { WalletConnectionStatus } from './walletStatus'
import type { DuskWalletLike } from './walletSessionTypes'

type RefreshWalletStatus = () => Promise<unknown>

const networkSwitchRefreshAttempts = 8
const networkSwitchRefreshDelayMs = 250

export type WalletConnectionActionArgs = {
  connectOptions?: DuskConnectOptions
  expectedChainId: string
  refreshWalletConnectionState: RefreshWalletStatus
  refreshWalletSessionState: RefreshWalletStatus
  wallet: DuskWalletLike
}

export async function performWalletConnectionAction({
  connectOptions,
  expectedChainId,
  refreshWalletConnectionState,
  refreshWalletSessionState,
  wallet,
}: WalletConnectionActionArgs) {
  const status = walletStatusFromUnknown(await refreshWalletConnectionState())

  if (status === 'wrong-network' && expectedChainId && wallet.switchChain) {
    await wallet.switchChain({ chainId: expectedChainId })
    await waitForExpectedWalletNetwork(refreshWalletSessionState)
    return { openModal: false }
  }

  if (status === 'locked' && wallet.connect) {
    await wallet.connect(connectOptions)
    await refreshWalletSessionState()
    return { openModal: false }
  }

  return { openModal: true }
}

async function waitForExpectedWalletNetwork(refreshWalletSessionState: RefreshWalletStatus) {
  let lastStatus: WalletConnectionStatus | null = null

  for (let attempt = 0; attempt < networkSwitchRefreshAttempts; attempt += 1) {
    lastStatus = walletStatusFromUnknown(await refreshWalletSessionState())
    if (lastStatus && lastStatus !== 'wrong-network') return lastStatus
    if (attempt < networkSwitchRefreshAttempts - 1) {
      await delay(networkSwitchRefreshDelayMs)
    }
  }

  return lastStatus
}

function delay(ms: number) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms)
  })
}

function walletStatusFromUnknown(value: unknown): WalletConnectionStatus | null {
  return typeof value === 'string' && walletStatuses.has(value as WalletConnectionStatus)
    ? value as WalletConnectionStatus
    : null
}

const walletStatuses = new Set<WalletConnectionStatus>([
  'detecting',
  'missing',
  'disconnected',
  'locked',
  'wrong-network',
  'connected',
])
