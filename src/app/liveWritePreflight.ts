import {
  checkPublicBalanceForWrite,
  type DuskConnectOptions,
  type DuskWalletState,
  isWalletLockedMessage,
  userFacingErrorMessage,
} from '../names/internal'

export type BalanceWallet = {
  connect?: (options?: DuskConnectOptions) => Promise<unknown>
  getPublicBalance: () => Promise<{ value: string }>
  state?: DuskWalletState
  switchChain?: (params: { nodeUrl: string }) => Promise<unknown>
}

export type WalletModalControl = {
  open: () => void
}

type EnsurePublicBalanceForLiveWriteRequestArgs = {
  action: string
  connectKit: WalletModalControl
  connectOptions?: DuskConnectOptions
  expectedNodeUrl?: string
  extraRequiredLux?: bigint
  liveWritesEnabled: boolean
  refreshWalletConnectionState: () => Promise<unknown>
  refreshWalletSessionState: () => Promise<unknown>
  setError: (message: string) => void
  transactionCount?: number
  wallet: BalanceWallet
}

export async function ensurePublicBalanceForLiveWriteRequest({
  action,
  connectKit,
  connectOptions,
  expectedNodeUrl,
  extraRequiredLux = 0n,
  liveWritesEnabled,
  refreshWalletConnectionState,
  refreshWalletSessionState,
  setError,
  transactionCount = 1,
  wallet,
}: EnsurePublicBalanceForLiveWriteRequestArgs) {
  if (!liveWritesEnabled) return true

  try {
    await ensureExpectedWalletNode({ expectedNodeUrl, refreshWalletSessionState, wallet })
    return await checkWalletPublicBalance({
      action,
      extraRequiredLux,
      setError,
      transactionCount,
      wallet,
    })
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error)
    if (!isWalletLockedMessage(rawMessage)) {
      setError(`Could not check public balance before ${action}: ${userFacingErrorMessage(error)}`)
      return false
    }

    const recovered = await recoverLockedWalletForLiveWrite({
      action,
      connectKit,
      connectOptions,
      refreshWalletConnectionState,
      refreshWalletSessionState,
      setError,
      wallet,
    })
    if (!recovered) return false

    try {
      await ensureExpectedWalletNode({ expectedNodeUrl, refreshWalletSessionState, wallet })
      return await checkWalletPublicBalance({
        action,
        extraRequiredLux,
        setError,
        transactionCount,
        wallet,
      })
    } catch (retryError) {
      setError(`Could not check public balance before ${action}: ${userFacingErrorMessage(retryError)}`)
      return false
    }
  }
}

async function ensureExpectedWalletNode({
  expectedNodeUrl,
  refreshWalletSessionState,
  wallet,
}: {
  expectedNodeUrl?: string
  refreshWalletSessionState: () => Promise<unknown>
  wallet: BalanceWallet
}) {
  const expected = normalizedUrl(expectedNodeUrl)
  if (!expected) return
  const current = normalizedUrl(wallet.state?.node?.nodeUrl)
  if (current === expected) return
  if (!wallet.switchChain) throw new Error('Dusk Wallet cannot switch to the configured local node.')

  await wallet.switchChain({ nodeUrl: expectedNodeUrl! })
  await refreshWalletSessionState()
  const selected = normalizedUrl(wallet.state?.node?.nodeUrl)
  if (selected && selected !== expected) {
    throw new Error('Dusk Wallet did not switch to the configured local node.')
  }
}

function normalizedUrl(value: string | null | undefined) {
  try {
    const url = new URL(value ?? '')
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/u, '')}`
  } catch {
    return ''
  }
}

async function checkWalletPublicBalance({
  action,
  extraRequiredLux,
  setError,
  transactionCount,
  wallet,
}: {
  action: string
  extraRequiredLux: bigint
  setError: (message: string) => void
  transactionCount: number
  wallet: Pick<BalanceWallet, 'getPublicBalance'>
}) {
  const balance = await wallet.getPublicBalance()
  const preflight = checkPublicBalanceForWrite({
    balanceLux: balance.value,
    action,
    transactionCount,
    extraRequiredLux,
  })

  if (preflight.ok) return true

  setError(preflight.message)
  return false
}

export async function recoverLockedWalletForLiveWrite({
  action,
  connectKit,
  connectOptions,
  refreshWalletConnectionState,
  refreshWalletSessionState,
  setError,
  wallet,
}: {
  action: string
  connectKit: WalletModalControl
  connectOptions?: DuskConnectOptions
  refreshWalletConnectionState: () => Promise<unknown>
  refreshWalletSessionState: () => Promise<unknown>
  setError: (message: string) => void
  wallet: Pick<BalanceWallet, 'connect'>
}) {
  setError(`Unlock your wallet to continue ${action}.`)
  let directUnlockAttempted = false

  try {
    const status = await refreshWalletConnectionState()
    if (status === 'locked' && wallet.connect) {
      directUnlockAttempted = true
      await wallet.connect(connectOptions)
      const nextStatus = await refreshWalletSessionState()
      if (nextStatus === 'connected') {
        setError('')
        return true
      }
      return false
    }
    if (status === 'connected') {
      setError('')
      return true
    }
  } catch (error) {
    setError(userFacingErrorMessage(error))
    if (!directUnlockAttempted) {
      connectKit.open()
    }
    return false
  }

  if (!directUnlockAttempted) connectKit.open()
  return false
}
