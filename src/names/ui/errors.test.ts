import { expect, it, vi } from 'vitest'
import { submitDuskDomainWrite } from '../transactions'
import { userFacingErrorMessage } from './errors'

// QuoteChanged and FeeMismatch also come from read-only quotes, before any wallet request, so the
// shared copy never says a payment was returned; only a confirmed failed transaction may say so.
it.each([
  ['Panic: DuskDS:v1:QuoteChanged', 'The registration price changed. Review the new price and try again.'],
  ['Contract read failed: Panic { msg: "DuskDS:v1:QuoteChanged" }', 'The registration price changed. Review the new price and try again.'],
  ['Panic: DuskDS:v1:FeeMismatch', 'The price changed. Review the new price and try again.'],
  // The SDK refuses to build a reveal from a quote that is closed or no longer public.
  ['Quote is not open for public registration', 'This name can’t be registered under the current registration rules.'],
  // Blocks kept landing while the SDK read, after the reads were tried again.
  ['Chain tip changed during read; retry the snapshot', 'New blocks kept arriving while this was read. Try again.'],
  ['Registration quote does not match placement and previous lifecycle', 'New blocks kept arriving while the price was checked. Try again.'],
])('explains %j plainly', (raw, copy) => {
  const shown = userFacingErrorMessage(new Error(raw))
  expect(shown).not.toMatch(/payment|returned|refused|refund/i)
  expect(shown).toBe(copy)
})

// Closed is the contracts' refusal while registrations are paused or closed, and while a market
// takes no new orders. A signed transaction reports it in its receipt; a read reports it as a panic.
it.each([
  ['Panic: DuskDS:v1:Closed', 'complete_registration', 'Registrations are closed right now. Try again when they reopen.'],
  ['Contract read failed: Panic { msg: "DuskDS:v1:Closed" }', 'commit', 'Registrations are closed right now. Try again when they reopen.'],
  ['Panic { msg: "DuskDS:v1:Closed" }', undefined, 'Registrations are closed right now. Try again when they reopen.'],
  ['Panic: DuskDS:v1:Closed', 'escrow_fixed_sale', 'This market isn’t taking new orders right now. Existing orders can still be completed or cancelled.'],
  ['Panic: DuskDS:v1:Closed', 'place_bid', 'This market isn’t taking new orders right now. Existing orders can still be completed or cancelled.'],
])('explains a Closed refusal of %j for %s', (raw, functionName, copy) => {
  expect(userFacingErrorMessage(new Error(raw), undefined, { functionName })).toBe(copy)
})

it('explains a Closed refusal in a failed market write', async () => {
  const app = {
    prepareIntent: vi.fn(async () => { throw new Error('Contract read failed: Panic { msg: "DuskDS:v1:Closed" }') }),
    readContract: vi.fn(), prepareContractCall: vi.fn(), writeContract: vi.fn(),
  }
  const state = await submitDuskDomainWrite(app, { contract: 'marketplace', functionName: 'place_offer', kind: 'write', args: {} }, { name: 'aurora.dusk' })
  expect(state.message).toBe('This market isn’t taking new orders right now. Existing orders can still be completed or cancelled.')
})

it('says a listed renewal didn’t go through once the market no longer holds the name', () => {
  expect(userFacingErrorMessage(new Error('Panic: DuskDS:v1:CustodyMismatch'), undefined, { functionName: 'renew' }))
    .toBe('This name isn’t listed anymore, so the renewal didn’t go through.')
})
