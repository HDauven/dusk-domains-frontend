import { afterEach, expect, it, vi } from 'vitest'
import { readTransactionReceipt } from './confirmationRead'

afterEach(() => vi.unstubAllGlobals())
const hash = 'aa'.repeat(32)
it.each([
  { data: { tx: null } },
  { errors: ['unavailable'], data: { tx: { id: hash, blockHeight: 10, err: null } } },
  { data: { tx: { id: 'another', blockHeight: 10, err: null } } },
  { data: { tx: { id: hash, blockHeight: 10 } } },
])('does not confirm absent, mismatched or incomplete receipts', async body => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => body })))
  expect(await readTransactionReceipt('http://localhost/', hash)).toBeNull()
})
it('reports a reverted on-chain call as failed', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: { tx: { id: hash, blockHeight: 10, err: 'Name unavailable' } } }) })))
  expect(await readTransactionReceipt('http://localhost/', hash)).toEqual({ status: 'failed', blockHeight: 10, message: 'Name unavailable' })
})
