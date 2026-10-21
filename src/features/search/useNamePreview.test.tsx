import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { analyzeName, DEFAULT_FEE_CONFIG, REGISTRATION_YEAR_BLOCKS } from '../../names/internal'
import { useNamePreview } from './useNamePreview'
import { SearchResultOverview } from './SearchResultOverview'

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

it.each(['bad\uD800', 'bad\uDC00', 'bad\uD800x.alpha.dusk'])(
  'shows a clear validation message without crashing the name preview for %j', query => {
    function Preview() {
      const { canRegister, nodeHex, result } = useNamePreview({ apiSearchResult: null, query, currentBlockHeight: 100,
        duration: 1, feeConfig: DEFAULT_FEE_CONFIG, managedNameExpiresAt: 200,
        nowSeconds: 1_790_000_000, renewalYears: 1 })
      expect(canRegister).toBe(false)
      expect(nodeHex).toBe('')
      expect(result.status).toBe('invalid')
      return <SearchResultOverview canRegister={canRegister} displayName={result.displayName}
        resultStatus={result.status} resultIssues={result.issues}
        onContinueRegistration={() => { throw new Error('Invalid name must not be registered') }} onViewDetails={() => {}}
        quote={{} as never} reservation={{} as never} />
    }
    const markup = renderToStaticMarkup(<Preview />)
    expect(markup).toContain('Name contains malformed Unicode. Remove or retype the invalid character.')
    expect(markup).not.toContain('<button')
  },
)

// Renewal follows the directory's renewal schedule; a registration policy replacement never changes it.
it.each([
  ['the renewal schedule', { oneChar: 800e9, twoChar: 320e9, threeChar: 120e9, fourChar: 40e9, fivePlus: 8e9 }, '16'],
  ['nothing, without a quote or the schedule', undefined, ''],
])('estimates a renewal from %s, never from registration prices', (_, renewalYearLux, shown) => {
  function Preview() {
    const { renewalFee } = useNamePreview({
      apiSearchResult: { ...analyzeName('alice.dusk'), status: 'registered' }, currentBlockHeight: 100, duration: 1,
      // A replacement policy charges 15 DUSK a year to register five or more characters.
      feeConfig: { ...DEFAULT_FEE_CONFIG, fivePlusYearLux: 15e9, ...(renewalYearLux ? { renewalYearLux } : {}) },
      managedNameExpiresAt: 20_000, nowSeconds: 1_790_000_000, query: 'alice.dusk', renewalYears: 2,
    })
    return <output>{renewalFee}</output>
  }
  expect(renderToStaticMarkup(<Preview />)).toBe(`<output>${shown}</output>`)
})
