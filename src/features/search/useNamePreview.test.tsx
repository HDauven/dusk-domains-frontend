import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { DEFAULT_FEE_CONFIG, REGISTRATION_YEAR_BLOCKS } from '../../names/internal'
import { useNamePreview } from './useNamePreview'

it('previews a grace renewal from the old expiry', () => {
  function Preview() {
    const { renewalPreviewLifecycle } = useNamePreview({
      apiSearchResult: null, currentBlockHeight: 20_001, duration: 1,
      feeConfig: DEFAULT_FEE_CONFIG, managedNameExpiresAt: 20_000,
      nowSeconds: 1_790_000_000, query: 'aurora.dusk', renewalYears: 1,
    })
    return <output>{renewalPreviewLifecycle.expiresAt}</output>
  }
  expect(renderToStaticMarkup(<Preview />)).toBe(`<output>${20_000 + REGISTRATION_YEAR_BLOCKS}</output>`)
})

it.each(['docs.alice.dusk', 'docs.wallet.dusk'])('keeps %s out of public root registration', query => {
  function Preview() {
    const { canRegister } = useNamePreview({ apiSearchResult: null, query, currentBlockHeight: 100,
      duration: 1, feeConfig: DEFAULT_FEE_CONFIG, managedNameExpiresAt: 200,
      nowSeconds: 1_790_000_000, renewalYears: 1 })
    return <output>{String(canRegister)}</output>
  }
  expect(renderToStaticMarkup(<Preview />)).toBe('<output>false</output>')
})
