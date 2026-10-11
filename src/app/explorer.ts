/** A transaction's page on the configured block explorer, or null when none is configured. */
export function explorerTransactionUrl(explorerUrl: string | null | undefined, txId: string | null | undefined) {
  if (!explorerUrl || !txId || !/^[0-9a-f]{64}$/i.test(txId)) return null
  return `${explorerUrl}/transactions/transaction/?id=${txId.toLowerCase()}`
}
