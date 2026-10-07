import type { DuskDomainTxState } from '../names/internal'

export type ConfirmationState = DuskDomainTxState & { retryConfirmation?: () => void }
export type PendingConfirmation = { name: string; state: ConfirmationState & { txId: string } }

// Each round checks for five minutes. A retry resumes the read; it never sends a write.
export async function waitForConfirmation<T>(read: () => Promise<T | null>, onPause: (retry: () => void) => void, onChecking: () => void, signal?: AbortSignal): Promise<T> {
  for (;;) {
    onChecking()
    const deadline = Date.now() + 300_000
    while (Date.now() < deadline) {
      signal?.throwIfAborted()
      const value = await read().catch(() => null)
      signal?.throwIfAborted()
      if (value !== null) return value
      await new Promise<void>((resolve, reject) => {
        const aborted = () => { clearTimeout(timer); reject(signal?.reason) }
        const timer = setTimeout(() => { signal?.removeEventListener('abort', aborted); resolve() }, 4_000)
        signal?.addEventListener('abort', aborted, { once: true })
      })
    }
    signal?.throwIfAborted()
    await new Promise<void>((resolve, reject) => {
      const aborted = () => reject(signal?.reason)
      signal?.addEventListener('abort', aborted, { once: true })
      onPause(() => { signal?.removeEventListener('abort', aborted); resolve() })
    })
  }
}

export type TransactionReceipt = { status: 'executed' | 'failed'; blockHeight: number; message?: string }

export async function readTransactionReceipt(nodeUrl: string, txId: string, signal?: AbortSignal): Promise<TransactionReceipt | null> {
  const hash = txId.replace(/^0x/, '').toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(hash)) return null
  const response = await fetch(new URL('/on/graphql/query', nodeUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/graphql' },
    body: `{ tx(hash: "${hash}") { id err blockHeight } }`,
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
  })
  if (!response.ok) return null
  const body = await response.json()
  const tx = (body?.data ?? body)?.tx
  if (body.errors?.length || !tx || tx.id !== hash || !Number.isSafeInteger(tx.blockHeight) || tx.blockHeight < 0 || !('err' in tx)) return null
  if (tx.err !== null && typeof tx.err !== 'string') return null
  return { status: tx.err ? 'failed' : 'executed', blockHeight: tx.blockHeight, message: tx.err || undefined }
}
