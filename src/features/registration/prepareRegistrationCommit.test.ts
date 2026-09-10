import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { listPendingNameReservations, namehashHex, registrationCommitWindow, type DuskDomainTxState } from '../../names/internal'
import { prepareRegistrationCommit } from './prepareRegistrationCommit'
import { forgetPendingReservation } from '../search/actions/forgetPendingReservation'
import { openPendingReservation } from '../search/actions/openPendingReservation'
import { RegistrationPurchaseStep } from './RegistrationPurchaseStep'
import { RegistrationReviewStep } from './RegistrationReviewStep'
import { refreshCommitBlockStateFromIndexer } from './pendingReservationSync'
import type { PreparedRegistrationCommit } from './pendingReservationTypes'

vi.mock('../search/searchControllerReset', () => ({ resetSearchState: vi.fn() }))

const controller = `0x${'11'.repeat(32)}`
function args() {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value) })
  const noop = () => {}
  return {
    canPrepareCommit: true, displayName: 'resume.dusk', nodeHex: namehashHex('resume.dusk'), duration: 1,
    selectedAddress: 'owner', selectedAuthority: controller, runtimeConfig: { chainId: 'dusk:0', contracts: {} },
    liveDuskDomainsApp: {}, indexerClient: null, loadPendingReservations: () => listPendingNameReservations(),
    ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
    getCurrentBlockHeight: async () => 500, setCommitTxState: noop, setWalletError: vi.fn(),
    setRegistrationCompletion: noop, setPreparedCommit: noop, setCurrentBlockHeight: noop,
    setNowSeconds: noop, setCommitted: noop, setRegistrationStep: noop, setTxState: noop,
    setIndexerError: noop, setIndexerConfirmation: noop,
  }
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

it('saves before wallet approval and preserves the secret while a confirmed height read stalls', async () => {
  const props = args()
  const height = Promise.withResolvers<number>()
  let secretBeforeApproval: string | undefined
  const submitNameWrite = vi.fn(async (_name, _call, options) => {
    options.onUpdate({ status: 'awaiting_approval' })
    secretBeforeApproval = listPendingNameReservations()[0]?.secret
    return { status: 'executed', txId: 'confirmed-tx' } as DuskDomainTxState
  })
  const getCurrentBlockHeight = vi.fn(() => height.promise)
  const pending = prepareRegistrationCommit({ ...props, submitNameWrite, getCurrentBlockHeight } as never)
  await vi.waitFor(() => expect(getCurrentBlockHeight).toHaveBeenCalledOnce())
  const saved = listPendingNameReservations()[0]
  expect(secretBeforeApproval).toBeTruthy()
  expect(saved?.secret).toBe(secretBeforeApproval)
  expect(saved?.committedBlockHeight).toBeNull()
  height.resolve(500)
  await pending
  expect(listPendingNameReservations()[0]).toMatchObject({ secret: saved.secret,
    committedBlockHeight: 500, committedTxId: 'confirmed-tx' })
})

it('fails before broadcast if storage fails or a previous uncertain reservation exists', async () => {
  const props = args()
  const broadcast = vi.fn()
  const submitNameWrite = async (_name: unknown, _call: unknown, options: { onUpdate: (state: unknown) => void }) => {
    options.onUpdate({ status: 'awaiting_approval' })
    broadcast()
    return { status: 'rejected' }
  }
  await prepareRegistrationCommit({ ...props, submitNameWrite } as never)
  const saved = listPendingNameReservations()[0]
  expect(saved?.secret).toBeTruthy() // Rejection is not proof that a disconnected transport never broadcast.
  await prepareRegistrationCommit({ ...props, submitNameWrite } as never)
  expect(broadcast).toHaveBeenCalledOnce()
  expect(listPendingNameReservations()[0]).toEqual(saved)
  expect(props.setWalletError.mock.calls.at(-1)?.[0]).toContain('saved reservation')
  vi.stubGlobal('confirm', () => false)
  forgetPendingReservation(props as never, saved)
  expect(listPendingNameReservations()[0]).toEqual(saved)
  vi.stubGlobal('confirm', () => true)
  forgetPendingReservation(props as never, saved)
  expect(listPendingNameReservations()).toEqual([])
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('Quota exceeded') } })
  await prepareRegistrationCommit({ ...props, submitNameWrite } as never)
  expect(broadcast).toHaveBeenCalledOnce()
  expect(props.setWalletError.mock.calls.at(-1)?.[0]).toContain('browser storage')
})

it('does not call a rejected saved request signed or submitted after reopening Purchase and Review', async () => {
  const props = args()
  const submitNameWrite = vi.fn(async (_name, _call, options) => {
    options.onUpdate({ status: 'awaiting_approval' })
    return { status: 'rejected' }
  })
  await prepareRegistrationCommit({ ...props, submitNameWrite } as never)
  const saved = listPendingNameReservations()[0]
  expect(saved).toMatchObject({ committedBlockHeight: null, committedTxId: null })
  const setPreparedCommit = vi.fn(), setRegistrationStep = vi.fn()
  let committed = false, currentBlockHeight: number | null = null
  const noop = () => {}
  const getCommitment = vi.fn(async () => null)
  await openPendingReservation({ ...props, chainId: 'dusk:0', setPreparedCommit, setRegistrationStep,
    setCommitted: (value: boolean) => { committed = value },
    setCurrentBlockHeight: (value: number | null) => { currentBlockHeight = value },
    openSearchView: noop, setDuration: noop, setChecked: noop, setResultView: noop,
    setActivityLoading: noop, setApiSearchResult: noop, hydrateNameFromIndexer: noop,
    indexerClient: { getCommitment, getHealth: async () => ({ ok: true, currentBlockHeight: 500 }),
      searchName: async () => ({ canonical: saved.name, status: 'available' }) } } as never, saved)
  expect(getCommitment).toHaveBeenCalledExactlyOnceWith(saved.commitment)
  expect(setRegistrationStep).toHaveBeenLastCalledWith('purchase')
  expect(committed).toBe(true) // This flag resumes the flow; it does not prove a broadcast.
  const commitWindow = registrationCommitWindow(setPreparedCommit.mock.calls.at(-1)?.[0].committedBlockHeight, currentBlockHeight)
  expect(commitWindow.status).toBe('missing')
  const view = { ...props, committed, commitWindow, walletSetupState: 'connected',
    canRegister: true, canPrepareCommit: false, canRevealRegistration: false, commitBusy: false,
    commitStale: false, commitTxState: null, txBusy: false, txState: null,
    activeReferral: null, appliedReferral: null, registrationCompletion: null,
    registrationFee: 10, total: 10, networkFee: null, expiryDate: '-', registrationTargetAddress: 'owner' }
  const html = renderToStaticMarkup(createElement(RegistrationPurchaseStep, view as never))
    + renderToStaticMarkup(createElement(RegistrationReviewStep, view as never))
  expect(html).toContain('Unconfirmed')
  expect(html.match(/Reservation saved/g)).toHaveLength(2)
  expect(html).toContain('Check your wallet before retrying')
  expect(html).not.toMatch(/Reservation signed|Reservation submitted|>Reserved</)
  expect(html).not.toContain('Start by reserving the name')
  expect(submitNameWrite).toHaveBeenCalledOnce()
})

it('starts recovery aging after execution, not a long wallet approval', async () => {
  vi.useFakeTimers()
  const startedAt = new Date('2030-01-01T00:00:00Z').getTime()
  vi.setSystemTime(startedAt)
  const props = args()
  const state = { prepared: null as PreparedRegistrationCommit | null, height: null as number | null }
  const setPreparedCommit: Parameters<typeof refreshCommitBlockStateFromIndexer>[0]['setPreparedCommit'] = update => {
    state.prepared = typeof update === 'function' ? update(state.prepared) : update
  }
  const getCurrentBlockHeight = async () => null
  await prepareRegistrationCommit({ ...props, getCurrentBlockHeight, setPreparedCommit,
    submitNameWrite: async (_name: unknown, _call: unknown, options: { onUpdate: (state: unknown) => void }) => {
      options.onUpdate({ status: 'awaiting_approval' })
      vi.setSystemTime(startedAt + 90_000)
      return { status: 'executed', txId: 'confirmed-after-long-approval' }
    } } as never)
  const saved = listPendingNameReservations()[0]
  expect(saved).toMatchObject({ committedBlockHeight: null, committedTxId: 'confirmed-after-long-approval' })
  const getCommitment = vi.fn(async () => null)
  await refreshCommitBlockStateFromIndexer({ chainId: 'dusk:0', commitment: saved.commitment,
    getCurrentBlockHeight, selectedAuthority: controller, setPreparedCommit,
    setCurrentBlockHeight: height => { state.height = height }, loadPendingReservations: props.loadPendingReservations,
    indexerClient: { getHealth: async () => ({ ok: true, currentBlockHeight: 500 }), getCommitment } as never })
  expect(getCommitment).toHaveBeenCalledExactlyOnceWith(saved.commitment)
  expect(state.height).toBe(500)
  expect(listPendingNameReservations()[0].committedBlockHeight).toBeNull()
  expect(state.prepared?.committedBlockHeight).toBeNull()
  expect(registrationCommitWindow(state.prepared?.committedBlockHeight, state.height).status).toBe('missing')
  expect(saved.createdAt).toBe(new Date(startedAt).toISOString())
  expect(saved.updatedAt).toBe(new Date(startedAt + 90_000).toISOString())
})
