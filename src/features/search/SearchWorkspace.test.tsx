import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { SearchWorkspace } from './SearchWorkspace'

it('shows a single retryable first-load error without an availability claim', () => {
  const html = renderToStaticMarkup(<SearchWorkspace search={{ checked: true, resultReady: false, loading: false,
    query: 'alpha.dusk', onCheckAvailability: () => {}, onQueryChange: () => {}, readError: 'HTTP 429' }}
    result={{ resultView: 'overview' } as never} />)
  expect(html.match(/role="alert"/g)).toHaveLength(1)
  expect(html).toContain('Retry')
  expect(html).not.toContain('Available')
  expect(html).not.toContain('HTTP 429')
})

it('does not publish saved-reservation availability before its name snapshot succeeds', async () => {
  const { openPendingReservation } = await import('./actions/openPendingReservation')
  const { searchActions } = await import('./test-fixtures/searchActions')
  const { reservation } = await import('../../test/frozenFixtures')
  const actions = searchActions()
  await openPendingReservation({ ...actions, openSearchView: () => {}, beginNameRead: () => () => true,
    hydrateNameFromIndexer: async () => { throw new Error('Offline') }, indexerClient: {
      searchName: async () => ({ canonical: 'alpha.dusk', status: 'available' }), getHealth: async () => ({ ok: true }), getCommitment: async () => null,
    },
  } as never, reservation())
  expect(actions.search.showResult).not.toHaveBeenCalled()
})

it('registers from a ready saved reservation, and only opens a claim that is not ready', async () => {
  const { SearchResultOverview } = await import('./SearchResultOverview')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const reservation = { name: 'resume.dusk', commitment: 'c' } as never
  for (const [status, label] of [['ready', 'Register'], ['waiting', 'Open']] as const) {
    const opened: unknown[][] = []
    const element = SearchResultOverview({ canRegister: true, displayName: 'resume.dusk', onContinueRegistration: () => {}, onViewDetails: () => {},
      resultIssues: [], resultStatus: 'available', quote: { duration: 1, expiryDate: '', feeConfigLoading: false, onDurationChange: () => {}, registrationFee: 10 },
      reservation: { onOpenPendingReservation: (...args: unknown[]) => { opened.push(args) }, onOpenPendingReservations: () => {}, savedReservation: reservation,
        savedReservationWindow: { status, waitBlocks: 5 } } })
    expect(renderToStaticMarkup(element)).toContain(label)
    const button = findButton(element, label)
    button.props.onClick()
    expect(opened).toEqual([[reservation, { register: status === 'ready' }]])
  }
})

function findButton(node: unknown, label: string): { props: { onClick: () => void } } {
  const queue = [node]
  while (queue.length) {
    const current = queue.shift() as { props?: { children?: unknown, onClick?: () => void } } | unknown[] | null
    if (Array.isArray(current)) { queue.push(...current); continue }
    if (!current || typeof current !== 'object' || !('props' in current) || !current.props) continue
    const text = JSON.stringify(current.props.children ?? '')
    if (current.props.onClick && text.includes(label)) return current as { props: { onClick: () => void } }
    queue.push(current.props.children)
  }
  throw new Error(`No ${label} button`)
}
