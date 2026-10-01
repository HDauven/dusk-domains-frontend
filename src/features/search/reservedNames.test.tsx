import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { analyzeName, DEFAULT_FEE_CONFIG, type NameResult } from '../../names/internal'
import { useNamePreview } from './useNamePreview'
import { NameHeader } from './NameHeader'
import { SearchResultOverview } from './SearchResultOverview'
import { abbreviate } from '../../utils/format'

const owner = `0x${'24'.repeat(32)}`
const taken: NameResult = { ...analyzeName('wallet.dusk', DEFAULT_FEE_CONFIG), status: 'registered', issues: [], transactionBlocked: true }

function Result({ indexed }: { indexed: NameResult | null }) {
  const { result, displayName, canRegister } = useNamePreview({ apiSearchResult: indexed, currentBlockHeight: 100, duration: 1, feeConfig: DEFAULT_FEE_CONFIG, managedNameExpiresAt: 10_000, nowSeconds: 1_790_000_000, query: 'wallet.dusk', renewalYears: 1 })
  return <>
    <NameHeader displayName={displayName} lifecycleLabel={null} primaryVerified={false} records={[]} reserved={false} status={result.status} owner={owner} />
    <SearchResultOverview canRegister={canRegister} displayName={displayName} duration={1} expiryDate="" feeConfigLoading={false} onContinueRegistration={vi.fn()} onDurationChange={vi.fn()} onOpenPendingReservation={vi.fn()} onOpenPendingReservations={vi.fn()} onViewDetails={vi.fn()} registrationFee={0} resultIssues={result.issues} resultStatus={result.status} savedReservation={null} savedReservationWindow={null} />
  </>
}

it('shows an issued reserved name as taken with its owner and profile link', () => {
  const html = renderToStaticMarkup(<Result indexed={taken} />)
  expect(html).toContain('This name is taken')
  expect(html).toContain('View profile')
  expect(html).toContain(`<code>${owner}</code>`)
  expect(html).toContain(abbreviate(owner))
  expect(html).not.toContain('This name can’t be claimed')
  expect(html).not.toContain('>Reserved<')
})

it('keeps unissued or released protected labels reserved without an owner or profile action', () => {
  for (const indexed of [null, analyzeName('wallet.dusk', DEFAULT_FEE_CONFIG)]) {
    const html = renderToStaticMarkup(<Result indexed={indexed} />)
    expect(html).toContain('>Reserved<')
    expect(html).toContain('This label is protected')
    expect(html).not.toContain('View profile')
    expect(html).not.toContain(owner)
  }
})
