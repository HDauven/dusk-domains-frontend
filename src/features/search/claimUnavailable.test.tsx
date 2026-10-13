// @vitest-environment happy-dom
import { act, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import type { RegistrationQuote } from '@duskdomains/sdk'
import { analyzeName, DEFAULT_FEE_CONFIG, type DuskDomainsOnChainClient } from '../../names/internal'
import { SearchResultOverview } from './SearchResultOverview'
import { useNamePreview } from './useNamePreview'

const overview = (props: Partial<Parameters<typeof SearchResultOverview>[0]>) => renderToStaticMarkup(<SearchResultOverview canRegister={false}
  displayName="aurora.dusk" resultStatus="available" resultIssues={[]} onContinueRegistration={() => {}} onViewDetails={() => {}}
  quote={{} as never} reservation={{ savedReservation: null } as never} {...props} />)

it.each([
  ['the reason the claim gives', { blockedReason: 'This site has not been updated for the new registration prices yet. Try again later.' },
    'This site has not been updated for the new registration prices yet. Try again later.'],
  ['a registration pause', { registrationsPaused: true, registrationUnavailable: true }, 'New reservations and registrations will resume when the operator reopens them.'],
])('says why an available name can’t be claimed: %s', (_, props, copy) => {
  const html = overview(props)
  expect(html).toContain(copy)
  expect(html).not.toContain('This name can be registered.')
})

const quote = (status: 'Public' | 'Reserved' | 'Denied', open = true) => ({
  policy: Array(32).fill(9), policy_version: 5n, total_lux: status === 'Public' ? '15000000000' : '0', height: 100n,
  quote: { version: 1, request_hash: Array(32).fill(1), config_version: 1n, registration_open: open, label_status: status,
    base_lux: status === 'Public' ? '15000000000' : '0', premium_lux: '0', base_referral_bps: 2000, premium_referral_bps: 0, referral_lux: '0', valid_until: 100n },
}) as RegistrationQuote

// A replacement policy can close registration or reserve a name, and this site can lag behind it.
it.each([
  ['the site has not loaded the replacement policy', { ok: false, error: { code: 'contract_read_failed', message: 'This site has not been updated for the new registration prices yet. Try again later.' } },
    'This site has not been updated for the new registration prices yet. Try again later.'],
  ['the replacement policy reserves the name', { ok: true, value: { store: 'store', quote: quote('Reserved') } }, 'This name is reserved under the current registration rules.'],
  ['the replacement policy refuses the name', { ok: true, value: { store: 'store', quote: quote('Denied') } }, 'This name can’t be registered under the current registration rules.'],
  ['registration is closed', { ok: true, value: { store: 'store', quote: quote('Public', false) } }, 'Registration is closed right now. Try again later.'],
  // SetPolicy executed between the quote's context read and its store read. Nothing was signed or paid.
  ['the policy changed while the claim was quoted', { ok: false, error: { code: 'contract_read_failed', message: 'Contract read failed: Panic { msg: "DuskDS:v1:QuoteChanged" }' } },
    'The registration price changed. Review the new price and try again.'],
])('gives the claim a reason when %s', async (_, reply, reason) => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = { getRegistrationQuote: vi.fn(async () => reply) } as unknown as DuskDomainsOnChainClient
  let preview!: ReturnType<typeof useNamePreview>
  function Probe() {
    const value = useNamePreview({ onChainClient: client, apiSearchResult: analyzeName('aurora.dusk'), currentBlockHeight: 100, duration: 1,
      feeConfig: DEFAULT_FEE_CONFIG, managedNameExpiresAt: 0, nowSeconds: 1_790_000_000, query: 'aurora.dusk', renewalYears: 1 })
    useLayoutEffect(() => { preview = value })
    return null
  }
  const root = createRoot(document.createElement('div'))
  try {
    await act(async () => root.render(<Probe />))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
    expect(preview.canRegister).toBe(false)
    // No quote read sends a transaction, so no reason may speak of a refused or returned payment.
    expect(preview.registrationBlockedReason).not.toMatch(/payment|returned|refused|refund/i)
    expect(preview.registrationBlockedReason).toBe(reason)
  } finally {
    await act(async () => root.unmount())
    vi.unstubAllGlobals()
  }
})

// Rusk answers the store's Closed trap in a read-only quote with HTTP 500, so a known pause means
// no registration quote is read at all. Renewals ignore the pause and are still quoted.
it.each(['available', 'registered'] as const)('while registrations are paused, reads no registration quote for a %s name', async status => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = {
    getRegistrationQuote: vi.fn(async () => ({ ok: true, value: { store: 'store', quote: quote('Public') } })),
    getRenewalQuote: vi.fn(async () => ({ ok: false, error: { code: 'contract_read_failed', message: 'unused' } })),
  } as unknown as DuskDomainsOnChainClient
  let preview!: ReturnType<typeof useNamePreview>
  function Probe({ paused }: { paused: boolean }) {
    const value = useNamePreview({ onChainClient: client, apiSearchResult: { ...analyzeName('aurora.dusk'), status }, currentBlockHeight: 100, duration: 1,
      feeConfig: DEFAULT_FEE_CONFIG, managedNameExpiresAt: 0, nowSeconds: 1_790_000_000, query: 'aurora.dusk', renewalYears: 1, registrationsPaused: paused })
    useLayoutEffect(() => { preview = value })
    return null
  }
  const root = createRoot(document.createElement('div'))
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
  try {
    await act(async () => root.render(<Probe paused />))
    await settle()
    expect(client.getRegistrationQuote).not.toHaveBeenCalled()
    expect(preview.canRegister).toBe(false)
    // Nothing is loading: the pause is the answer.
    expect(preview.quoteLoading).toBe(false)
    if (status === 'registered') expect(client.getRenewalQuote).toHaveBeenCalled()
    else {
      // Once registrations reopen, the name is quoted again.
      await act(async () => root.render(<Probe paused={false} />))
      await settle()
      expect(client.getRegistrationQuote).toHaveBeenCalled()
      expect(preview.canRegister).toBe(true)
    }
  } finally {
    await act(async () => root.unmount())
    vi.unstubAllGlobals()
  }
})
