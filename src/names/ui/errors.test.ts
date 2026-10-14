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
  // Another store holds the address's primary link, which only the address can clear first.
  ['Panic: DuskDS:v1:PrimaryAlreadySet', 'Your Dusk address already has a primary name, kept in another shard. Clear that one first, then set this one.'],
])('explains %j plainly', (raw, copy) => {
  const shown = userFacingErrorMessage(new Error(raw))
  expect(shown).not.toMatch(/payment|returned|refused|refund/i)
  expect(shown).toBe(copy)
})

// set_primary and clear_primary refusals, each in the words of the call that met it.
it.each([
  ['set_primary_name', 'ForwardMismatch', 'This name’s Dusk address record isn’t this wallet’s address, so it can’t be this wallet’s primary name.'],
  ['set_primary_name', 'Unauthorized', 'Only the owner or manager of this name, connected with the wallet for its Dusk address, can make it a primary name.'],
  ['set_primary_name', 'Expired', 'This name has expired, so it can’t be a primary name. Renew it first.'],
  ['set_primary_name', 'NotFound', 'This name or its Dusk address record isn’t there anymore. Refresh and check it again.'],
  ['set_primary_name', 'Stale', 'This name changed since you reviewed it. Refresh and check it again.'],
  ['set_primary_name', 'MovePending', 'This name is moving between shards. Try again after the move finishes.'],
  ['set_primary_name', 'Moved', 'This name moved to another shard. Refresh and check it again.'],
  ['set_primary_name', 'WrongHome', 'This name moved to another shard. Refresh and check it again.'],
  ['set_primary_name', 'Capacity', 'This shard can’t keep another primary name right now. Try again later.'],
  ['set_primary_name', 'PrimaryAlreadySet', 'Your Dusk address already has a primary name, kept in another shard. Clear that one first, then set this one.'],
  ['clear_primary_name', 'Unauthorized', 'Only the wallet for this Dusk address can clear its primary name.'],
  ['clear_primary_name', 'NotFound', 'This Dusk address has no primary name to clear.'],
  ['clear_primary_name', 'Stale', 'Your primary name changed since you reviewed it. Check it again before continuing.'],
  ['clear_primary_name', 'MovePending', 'Your primary name is moving between shards. Clear it after the move finishes.'],
  ['clear_primary_name', 'Moved', 'Your primary name moved to another shard. Refresh and check it again.'],
  ['clear_primary_name', 'WrongHome', 'Your primary name moved to another shard. Refresh and check it again.'],
] as const)('explains %s’s %s refusal plainly', (functionName, code, copy) => {
  expect(userFacingErrorMessage(new Error(`Panic: DuskDS:v1:${code}`), undefined, { functionName })).toBe(copy)
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
