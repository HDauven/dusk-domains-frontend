// @vitest-environment happy-dom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { useRegistrationRuntime } from '../../app/useRegistrationRuntime'
import { deriveRegistrationCapabilities } from '../../app/derived/registrationCapabilities'
import { registrationCommitWindow } from '../../names/internal'
import { reservation } from '../../test/frozenFixtures'
import { RegistrationPurchaseStep } from './RegistrationPurchaseStep'
import { useSavedPendingReservationRefresh } from './useSavedPendingReservationRefresh'
import type { PreparedRegistrationCommit } from './pendingReservationTypes'

const host = document.createElement('div')
const root = createRoot(host)
const noop = () => {}
afterEach(async () => { await act(async () => root.render(null)); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it.each(['ready', 'ended', 'stale'].flatMap(end => ['node', 'indexer'].map(source => ({ end, source }))))('reads reveal height within three seconds and stops when $end ($source)', async ({ end, source }) => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.useFakeTimers()
  const saved = reservation()
  let height = 100
  const getCurrentBlockHeight = vi.fn(async () => height)
  const getHealth = vi.fn(async () => ({ currentBlockHeight: height }))
  const indexerClient = source === 'indexer' ? { getHealth, getCommitment: async () => null } as never : null
  const readHeight = source === 'indexer' ? getHealth : getCurrentBlockHeight
  let clearCommit: () => void
  function Probe() {
    const [currentBlockHeight, setCurrentBlockHeight] = useState<number | null>(100)
    const [preparedCommit, setPreparedCommit] = useState<PreparedRegistrationCommit | null>(saved)
    const [, setNowSeconds] = useState(0)
    clearCommit = () => setPreparedCommit(null)
    const args = { chainId: saved.chainId, selectedAddress: saved.ownerAddress, selectedAuthority: saved.controller,
      mainView: 'marketplace' as const, indexerClient, getCurrentBlockHeight, preparedCommit, setPreparedCommit,
      currentBlockHeight, setCurrentBlockHeight, setNowSeconds }
    useRegistrationRuntime(args)
    const commitWindow = registrationCommitWindow(preparedCommit?.committedBlockHeight, currentBlockHeight)
    const { canRevealRegistration } = deriveRegistrationCapabilities({
      ...args, commitWindow, canRegister: true, commitBusy: false, committed: Boolean(preparedCommit),
      nodeHex: saved.node, registrationCompletion: null, registrationTargetReady: true,
      strandedCommitment: null, txBusy: false, walletAuthorized: true,
    })
    return <RegistrationPurchaseStep
      reservation={{ canRestartReservation: false, commitWindow, onRestartReservation: noop, reservationStranded: false }}
      purchase={{ canRevealRegistration, onRegisterName: noop, onSetAddress: noop, registrationCompletion: null, txBusy: false, txState: null }}
      wallet={{ installUrl: '', onOpenWalletConnection: noop, walletSetupState: 'connected' }} />
  }
  await act(async () => root.render(<Probe />))
  const register = () => [...host.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Register')!
  expect(register().disabled).toBe(true)
  for (let block = 1; block <= (end === 'ready' ? 5 : 2); block++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(block === 1 ? 10_000 : 7_000) })
    height = 100 + block
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000) })
    expect(readHeight.mock.calls.length).toBeGreaterThan(block)
    if (end === 'ready') expect(register().disabled).toBe(block < 5)
  }
  if (end === 'ended') await act(async () => clearCommit())
  if (end === 'stale') {
    height = 9_000
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000) })
  }
  const reads = readHeight.mock.calls.length
  await act(async () => { await vi.advanceTimersByTimeAsync(180_000) })
  expect(readHeight).toHaveBeenCalledTimes(reads)
})

it('refreshes unready saved reservations every ten seconds, then uses the slow interval', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.useFakeTimers()
  let visible = true
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible ? 'visible' : 'hidden')
  const pendingReservations = [reservation()]
  let height = 100
  const getCurrentBlockHeight = vi.fn(async () => height)
  const loadPendingReservations = () => pendingReservations
  function Probe() {
    const [currentBlockHeight, setCurrentBlockHeight] = useState<number | null>(100)
    const [, setNowSeconds] = useState(0)
    const args = { indexerClient: null, getCurrentBlockHeight, loadPendingReservations,
      pendingReservations, refreshListView: true, currentBlockHeight, setCurrentBlockHeight, setNowSeconds }
    useSavedPendingReservationRefresh(args)
    return <output>{registrationCommitWindow(100, currentBlockHeight).status}</output>
  }
  await act(async () => root.render(<Probe />))
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  expect(getCurrentBlockHeight).toHaveBeenCalledTimes(2)
  visible = false
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); await vi.advanceTimersByTimeAsync(30_000) })
  expect(getCurrentBlockHeight).toHaveBeenCalledTimes(2)
  height = 105
  visible = true
  await act(async () => document.dispatchEvent(new Event('visibilitychange')))
  expect(host.textContent).toBe('ready')
  expect(getCurrentBlockHeight).toHaveBeenCalledTimes(3)
  await act(async () => { await vi.advanceTimersByTimeAsync(179_999) })
  expect(getCurrentBlockHeight).toHaveBeenCalledTimes(3)
  await act(async () => { await vi.advanceTimersByTimeAsync(1) })
  expect(getCurrentBlockHeight).toHaveBeenCalledTimes(4)
})
