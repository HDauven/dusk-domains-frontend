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
