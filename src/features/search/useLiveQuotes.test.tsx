// @vitest-environment happy-dom
import { act, useLayoutEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { RegistrationQuote } from '@duskdomains/sdk'
import { analyzeName, type DuskDomainsOnChainClient } from '../../names/internal'
import { useLiveQuotes } from './useLiveQuotes'

let root: Root
let shown: ReturnType<typeof useLiveQuotes>
const result = analyzeName('example.dusk')
function Probe({ client, submitted = true }: { client: DuskDomainsOnChainClient; submitted?: boolean }) {
  const value = useLiveQuotes(client, submitted ? result : null, 1, 1, 'actor', 100)
  useLayoutEffect(() => {
    shown = value
  })
  return null
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  root = createRoot(document.createElement('div'))
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})
it('quotes only submitted searches and discards an outstanding quote when the network changes', async () => {
  const quote = { total_lux: '10000000000' } as RegistrationQuote
  let finish!: (value: unknown) => void
  const oldRead = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const newRead = vi.fn(async () => ({ ok: true, value: { quote: { ...quote, total_lux: '150000000000' } } }))
  const oldClient = { getRegistrationQuote: oldRead } as unknown as DuskDomainsOnChainClient
  const newClient = { getRegistrationQuote: newRead } as unknown as DuskDomainsOnChainClient
  await act(async () => root.render(<Probe client={oldClient} submitted={false} />))
  expect(oldRead).not.toHaveBeenCalled()
  await act(async () => root.render(<Probe client={oldClient} />))
  expect(shown).toBeNull()
  await act(async () => root.render(<Probe client={newClient} />))
  expect(shown?.registration?.total_lux).toBe('150000000000')
  await act(async () => finish({ ok: true, value: { quote } }))
  expect(shown?.registration?.total_lux).toBe('150000000000')
  await act(async () => root.render(<Probe client={oldClient} />))
  expect(shown).toBeNull()
})
