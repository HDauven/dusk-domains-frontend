import {
  checkPublicBalanceForWrite,
  type DuskConnectOptions,
  isWalletLockedMessage,
  userFacingErrorMessage,
} from '../names/internal'

export type BalanceWallet = {
  connect?: (options?: DuskConnectOptions) => Promise<unknown>
  getPublicBalance: () => Promise<{ value: string }>
}

export type WalletModalControl = {
  open: () => void
}

type EnsurePublicBalanceForLiveWriteRequestArgs = {
  action: string
  connectKit: WalletModalControl
  connectOptions?: DuskConnectOptions
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
