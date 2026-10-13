// @vitest-environment happy-dom
import { act, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import type { RegistrationQuote } from '@duskdomains/sdk'
import { analyzeName, DEFAULT_FEE_CONFIG, type DuskDomainsOnChainClient } from '../../names/internal'
import { useNamePreview } from './useNamePreview'

// A pause the indexer reports while a registration quote is on screen.
it('drops the quote on screen and turns Claim off when registrations pause, and quotes again when they reopen', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const quote = { policy: Array(32).fill(9), policy_version: 5n, total_lux: '10000000000', height: 100n,
    quote: { version: 1, request_hash: Array(32).fill(1), config_version: 1n, registration_open: true, label_status: 'Public',
      base_lux: '10000000000', premium_lux: '0', base_referral_bps: 2000, premium_referral_bps: 0, referral_lux: '0', valid_until: 100n } } as RegistrationQuote
  const client = { getRegistrationQuote: vi.fn(async () => ({ ok: true, value: { store: 'store', quote } })) } as unknown as DuskDomainsOnChainClient
  let preview!: ReturnType<typeof useNamePreview>
  function Probe({ registrationsPaused }: { registrationsPaused: boolean }) {
    const value = useNamePreview({ onChainClient: client, registrationsPaused, apiSearchResult: analyzeName('aurora.dusk'), currentBlockHeight: 100, duration: 1,
      feeConfig: DEFAULT_FEE_CONFIG, managedNameExpiresAt: 0, nowSeconds: 1_790_000_000, query: 'aurora.dusk', renewalYears: 1 })
    useLayoutEffect(() => { preview = value })
    return null
  }
  const root = createRoot(document.createElement('div'))
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
  try {
    await act(async () => root.render(<Probe registrationsPaused={false} />))
    await settle()
    expect(preview.canRegister).toBe(true)
    expect(preview.result.policyQuote).toBe(quote)
    await act(async () => root.render(<Probe registrationsPaused />))
    await settle()
    expect(preview.canRegister).toBe(false)
    expect(preview.result.policyQuote).toBeUndefined()
    expect(preview.quoteLoading).toBe(false)
    const reads = vi.mocked(client.getRegistrationQuote).mock.calls.length
    await act(async () => root.render(<Probe registrationsPaused={false} />))
    await settle()
    expect(vi.mocked(client.getRegistrationQuote).mock.calls.length).toBeGreaterThan(reads)
    expect(preview.canRegister).toBe(true)
  } finally {
    await act(async () => root.unmount())
    vi.unstubAllGlobals()
  }
})
