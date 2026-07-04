import type { RuntimeNotice } from './AppTypes'

export function useRuntimeNotice({
  indexerConfirmation,
  indexerError,
  walletError,
}: {
  indexerConfirmation: string
  indexerError: string
  walletError: string
}): RuntimeNotice | null {
  const message = walletError || indexerError || indexerConfirmation
  if (!message) return null

  return {
    tone: walletError || indexerError ? 'danger' : 'info',
    message,
  }
}
