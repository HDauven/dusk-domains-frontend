// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { useCommitmentBlockRefresh } from './useCommitmentBlockRefresh'
import { useSavedPendingReservationRefresh } from './useSavedPendingReservationRefresh'
import { refreshCommitBlockStateFromIndexer, refreshPendingReservationsFromIndexer } from './pendingReservationSync'
vi.mock('./pendingReservationSync', () => ({ refreshCommitBlockStateFromIndexer: vi.fn(async () => true), refreshPendingReservationsFromIndexer: vi.fn(async () => true) }))
const root = createRoot(document.createElement('div'))
afterEach(async () => { await act(async () => root.render(null)); vi.useRealTimers(); vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllGlobals() })
it('pauses reservation polls while hidden and refreshes once on return', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.useFakeTimers()
  let visible = false
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible ? 'visible' : 'hidden')
  const common = { indexerClient: {}, getCurrentBlockHeight: async () => 100, loadPendingReservations: () => [], setCurrentBlockHeight: () => {}, setNowSeconds: () => {} }
  const commit = { ...common, chainId: 'dusk:0', currentCommitment: 'commit', selectedAuthority: '', setPreparedCommit: () => {} }
  const saved = { ...common, pendingReservations: [{}], refreshListView: true }
  function Probe() { useCommitmentBlockRefresh(commit as never); useSavedPendingReservationRefresh(saved as never); return null }
  await act(async () => root.render(<Probe />))
  await act(async () => { await vi.advanceTimersByTimeAsync(180_000) })
  expect(refreshCommitBlockStateFromIndexer).not.toHaveBeenCalled()
  expect(refreshPendingReservationsFromIndexer).not.toHaveBeenCalled()
  visible = true
  await act(async () => document.dispatchEvent(new Event('visibilitychange')))
  expect(refreshCommitBlockStateFromIndexer).toHaveBeenCalledTimes(1)
  expect(refreshPendingReservationsFromIndexer).toHaveBeenCalledTimes(1)
})
