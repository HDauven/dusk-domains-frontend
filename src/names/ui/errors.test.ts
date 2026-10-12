import { expect, it } from 'vitest'
import { userFacingErrorMessage } from './errors'

// QuoteChanged and FeeMismatch also come from read-only quotes, before any wallet request, so the
// shared copy never says a payment was returned; only a confirmed failed transaction may say so.
it.each([
  ['Panic: DuskDS:v1:QuoteChanged', 'The registration price changed. Review the new price and try again.'],
  ['Contract read failed: Panic { msg: "DuskDS:v1:QuoteChanged" }', 'The registration price changed. Review the new price and try again.'],
  ['Panic: DuskDS:v1:FeeMismatch', 'The price changed. Review the new price and try again.'],
  // The SDK refuses to build a reveal from a quote that is closed or no longer public.
  ['Quote is not open for public registration', 'This name can’t be registered under the current registration rules.'],
])('explains %j plainly', (raw, copy) => {
  const shown = userFacingErrorMessage(new Error(raw))
  expect(shown).not.toMatch(/payment|returned|refused|refund/i)
  expect(shown).toBe(copy)
})
