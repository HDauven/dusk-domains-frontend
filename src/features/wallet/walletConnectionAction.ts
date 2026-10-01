import type { DuskConnectOptions } from '../../names/internal'
import type { WalletConnectionStatus } from './walletStatus'
import type { DuskWalletLike } from './walletSessionTypes'

type RefreshWalletStatus = () => Promise<unknown>

const networkSwitchRefreshAttempts = 8
const networkSwitchRefreshDelayMs = 250

export type WalletConnectionActionArgs = {
  connectOptions?: DuskConnectOptions
  expectedChainId: string
  expectedNodeUrl?: string
  refreshWalletConnectionState: RefreshWalletStatus
  refreshWalletSessionState: RefreshWalletStatus
  wallet: DuskWalletLike
}

export async function performWalletConnectionAction({
  connectOptions,
  expectedChainId,
  expectedNodeUrl = '',
  refreshWalletConnectionState,
  refreshWalletSessionState,
  wallet,
}: WalletConnectionActionArgs) {
  const status = walletStatusFromUnknown(await refreshWalletConnectionState())

  if (status === 'wrong-network' && (expectedNodeUrl || expectedChainId) && wallet.switchChain) {
    await wallet.switchChain(expectedNodeUrl ? { nodeUrl: expectedNodeUrl } : { chainId: expectedChainId })
    if (await waitForExpectedWalletNetwork(refreshWalletSessionState) === 'wrong-network') throw new Error('Your wallet is still on another network. Switch networks and try again.')
    return { openModal: false }
  }

  if (status === 'wrong-network') throw new Error('Switch your wallet to this app’s network, then try again.')
  if (status === 'connected') return { openModal: true }
  if (status === 'missing' || !wallet.connect) throw new Error('No wallet found. Install or enable Dusk Wallet, then try again.')
  try {
    await wallet.connect(connectOptions)
  } catch (error) {
    // Approval events can finish connecting before the original response arrives.
    if (walletStatusFromUnknown(await refreshWalletSessionState()) !== 'connected') throw error
  }
  const connected = walletStatusFromUnknown(await refreshWalletSessionState())
  if (connected === 'wrong-network') {
    if (!wallet.switchChain) throw new Error('Switch your wallet to this app’s network, then try again.')
    await wallet.switchChain(expectedNodeUrl ? { nodeUrl: expectedNodeUrl } : { chainId: expectedChainId })
    if (await waitForExpectedWalletNetwork(refreshWalletSessionState) === 'wrong-network') {
      throw new Error('Your wallet is still on another network. Switch networks and try again.')
    }
  }
  return { openModal: false }
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
