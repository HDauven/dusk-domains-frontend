import { searchActions } from '../features/search/test-fixtures/searchActions'
import { resetSearchState } from '../features/search/searchControllerReset'
import type { PendingConfirmation } from './confirmationRead'
import { createWriteAccess } from './writeAccess'
import { unpaused } from './operatorPause'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { useDuskDomainWriter } from './useDuskDomainWriter'
import { submitDuskDomainWrite, type DuskDomainTxState } from '../names/internal'

const wallet = { state: { installed: true, authorized: true, chainId: 'dusk:0', profiles: [{ account: 'owner', profileId: 'primary' }], selectedProfile: { account: 'owner', profileId: 'primary' } } as import('@dusk/connect').DuskWalletState }

vi.mock('../names/internal', async importOriginal => ({
  ...await importOriginal<typeof import('../names/internal')>(), submitDuskDomainWrite: vi.fn(),
}))

it('allows only one wallet write at a time and releases the guard on either outcome', async () => {
  let submit!: ReturnType<typeof useDuskDomainWriter>
  function Probe() {
    submit = useDuskDomainWriter({ wallet, chainId: 'dusk:0', liveDuskDomainsApp: {}, writeAccess: createWriteAccess({mode:'live_ready',liveWritesEnabled:true}, {} as never, unpaused) } as never)
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  const pending = Promise.withResolvers<DuskDomainTxState>()
  const executed = { status: 'executed' } as DuskDomainTxState
  vi.mocked(submitDuskDomainWrite).mockReturnValueOnce(pending.promise).mockResolvedValue(executed)
  const first = submit('first.dusk', {} as never)
  await expect(submit('second.dusk', {} as never)).rejects.toThrow('pending wallet transaction')
  expect(submitDuskDomainWrite).toHaveBeenCalledOnce()
  pending.resolve(executed)
  await first
  vi.mocked(submitDuskDomainWrite).mockRejectedValueOnce(new Error('Transport interrupted'))
  await expect(submit('third.dusk', {} as never)).rejects.toThrow('Transport interrupted')
  await expect(submit('fourth.dusk', {} as never)).resolves.toBe(executed)
})

it('rejects paused writes before the wallet and still submits exempt writes', async () => {
  vi.mocked(submitDuskDomainWrite).mockClear()
  let submit!: ReturnType<typeof useDuskDomainWriter>
  function Probe() {
    submit = useDuskDomainWriter({ wallet, chainId: 'dusk:0', liveDuskDomainsApp: {}, writeAccess: createWriteAccess({mode:'live_ready',liveWritesEnabled:true}, {} as never, { registrationsPaused: true, tradingPaused: true }) } as never)
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  await expect(submit('name.dusk', { contract: 'store', functionName: 'commit' } as never)).rejects.toThrow('Registrations are paused')
  await expect(submit('name.dusk', { contract: 'marketplace', functionName: 'place_offer' } as never)).rejects.toThrow('New marketplace orders are paused')
  expect(submitDuskDomainWrite).not.toHaveBeenCalled()
  await submit('name.dusk', { contract: 'marketplace', functionName: 'claim_refund' } as never)
  expect(submitDuskDomainWrite).toHaveBeenCalledOnce()
})

it('refuses preview writes before any wallet or simulated transaction', async () => {
  vi.mocked(submitDuskDomainWrite).mockClear()
  let submit!: ReturnType<typeof useDuskDomainWriter>
  function Probe() { submit = useDuskDomainWriter({ wallet, chainId: 'dusk:0', writeAccess: createWriteAccess({mode:'preview',liveWritesEnabled:false}, null, unpaused), liveDuskDomainsApp: null, contracts: {} as never }); return null }
  renderToStaticMarkup(createElement(Probe))
  await expect(submit('example.dusk', {} as never)).rejects.toThrow('Preview is read only')
  expect(submitDuskDomainWrite).not.toHaveBeenCalled()
})

it('keeps paused confirmation recoverable after navigation and releases the writer after retry', async () => {
  vi.useFakeTimers()
  const dispatchEvent = vi.fn()
  vi.stubGlobal('window', { dispatchEvent })
  const txId = 'ab'.repeat(32)
  let receipt: unknown = null
  let height = 5
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ data: { tx: receipt } }) }))
  vi.stubGlobal('fetch', fetchMock)
  const getHealth = vi.fn(async () => ({ ok: true, finalizedBlockHeight: height }))
  const updates: Array<import('./confirmationRead').ConfirmationState> = []
  const pendingUpdates: Array<PendingConfirmation | null> = []
  const onPendingConfirmation = (pending: PendingConfirmation | null) => pendingUpdates.push(pending)
  const timeout = { status: 'timeout', txId, context: { title: 'Register' } } as DuskDomainTxState
  vi.mocked(submitDuskDomainWrite).mockReset().mockImplementation(async (_app, _call, options) => { options?.onUpdate?.(timeout); return timeout })
  let submit!: ReturnType<typeof useDuskDomainWriter>
  function Probe() {
    submit = useDuskDomainWriter({ wallet, chainId: 'dusk:0', writeAccess: createWriteAccess({mode:'live_ready',liveWritesEnabled:true}, {} as never, unpaused), liveDuskDomainsApp: {}, contracts: {}, onPendingConfirmation, nodeUrl: 'http://127.0.0.1:18181/', indexerClient: { getHealth } } as never)
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  let finished = false
  const pending = submit('slow.dusk', {} as never, { onUpdate: state => updates.push(state) }).then(state => { finished = true; return state })
  try {
    await vi.advanceTimersByTimeAsync(64_000)
    expect(finished).toBe(false)
    expect(updates.at(-1)).toMatchObject({ status: 'executing', message: 'Still confirming…', txId })
    expect(updates.some(state => state.status === 'timeout')).toBe(false)
    receipt = { id: txId, blockHeight: 10, err: null }
    await vi.advanceTimersByTimeAsync(240_000)
    expect(finished).toBe(false)
    expect(updates.at(-1)?.retryConfirmation).toBeTypeOf('function')
    const reads = fetchMock.mock.calls.length
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetchMock).toHaveBeenCalledTimes(reads)
    const globalPending = pendingUpdates.at(-1)
    expect(globalPending).toMatchObject({name:'slow.dusk',state:{txId,status:'executing',retryConfirmation:expect.any(Function)}})
    resetSearchState(searchActions({ registration: { reset: () => { updates.length = 0 } } }), 'another.dusk')
    expect(updates).toEqual([])
    expect(pendingUpdates.at(-1)).toBe(globalPending)
    await expect(submit('another.dusk', {} as never)).rejects.toThrow('pending wallet transaction')
    height = 10
    globalPending!.state.retryConfirmation!()
    await vi.advanceTimersByTimeAsync(0)
    expect(await pending).toMatchObject({ status: 'executed', txId })
    expect(submitDuskDomainWrite).toHaveBeenCalledOnce()
    expect(pendingUpdates.at(-1)).toBeNull()
    vi.mocked(submitDuskDomainWrite).mockResolvedValueOnce({status:'executed'} as DuskDomainTxState)
    await expect(submit('next.dusk', {} as never)).resolves.toMatchObject({status:'executed'})
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({type:'dusk-domains:write-confirmed'}))
  } finally { vi.useRealTimers(); vi.unstubAllGlobals() }
})

it.each(['beta.dusk', 'alpha.dusk'])('resumes an old alpha write without changing the new %s workspace or its draft', async destination => {
  vi.useFakeTimers()
  const dispatchEvent = vi.fn()
  vi.stubGlobal('window', { dispatchEvent })
  let visit = { name: 'alpha.dusk' }
  let displayedName: string
  let draft: string
  let receipt: unknown = null
  const txId = 'cd'.repeat(32)
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: { tx: receipt } }) })))
  const timeout = { status: 'timeout', txId, context: { title: 'Save records' } } as DuskDomainTxState
  vi.mocked(submitDuskDomainWrite).mockReset().mockResolvedValue(timeout)
  let notice: PendingConfirmation | null = null
  const updateWorkspace = vi.fn()
  const confirmOwnershipWrite = vi.fn()
  const refresh = vi.fn(async () => { displayedName = 'alpha.dusk'; return false })
  let submit!: ReturnType<typeof useDuskDomainWriter>
  function Probe() {
    submit = useDuskDomainWriter({ wallet, chainId: 'dusk:0', liveDuskDomainsApp: {}, contracts: {}, nodeUrl: 'http://127.0.0.1:18181/',
      writeAccess: createWriteAccess({mode:'live_ready',liveWritesEnabled:true}, {} as never, unpaused),
      getWorkspaceToken: name => name === visit.name ? visit : null, confirmOwnershipWrite,
      onPendingConfirmation: pending => { notice = pending },
    })
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  const { saveDomainRecords } = await import('../features/domains/saveDomainRecords')
  try {
    const pending = saveDomainRecords({ activeRecordTarget:{name:'alpha.dusk',node:'11'.repeat(32)},canSaveRecords:true,
      recordDraftMutations:[{action:'set',key:'website',value:'https://a.test'}],runtimeConfig:{contracts:{}},
      ensureContractAuthorityForLiveWrite:()=>true,ensurePublicBalanceForLiveWrite:async()=>true,
      submitNameWrite:submit,setRecordError:vi.fn(),setRecordTxState:updateWorkspace,
      setRecordDrafts:()=>{draft=''},shouldApplyPreviewWriteFallback:refresh,
    } as never)
    await vi.advanceTimersByTimeAsync(304_000)
    const retry = (notice as PendingConfirmation | null)?.state.retryConfirmation
    expect(retry).toBeTypeOf('function')
    visit = { name: 'beta.dusk' }
    if (destination === 'alpha.dusk') visit = { name: 'alpha.dusk' }
    displayedName = destination
    draft = `${destination} unsaved draft`
    updateWorkspace.mockClear()
    receipt = { id: txId, blockHeight: 10, err: null }
    retry!()
    await pending
    expect(displayedName).toBe(destination)
    expect(draft).toBe(`${destination} unsaved draft`)
    expect(refresh).not.toHaveBeenCalled()
    expect(updateWorkspace).not.toHaveBeenCalled()
    expect(confirmOwnershipWrite).not.toHaveBeenCalled()
    expect(dispatchEvent).not.toHaveBeenCalled()
    expect(notice).toBeNull()
    vi.mocked(submitDuskDomainWrite).mockResolvedValueOnce({ status: 'rejected' } as DuskDomainTxState)
    await expect(submit('B.dusk', {} as never)).resolves.toMatchObject({ status: 'rejected' })
  } finally { vi.useRealTimers(); vi.unstubAllGlobals() }
})

it('keeps tracking wallet approval after leaving the originating workspace', async () => {
  const prepared = Promise.withResolvers<void>()
  const approved = Promise.withResolvers<void>()
  let visit: object | null = {}
  const sendToWallet = vi.fn()
  const onUpdate = vi.fn()
  const onPendingConfirmation = vi.fn()
  const txId = 'ef'.repeat(32)
  vi.mocked(submitDuskDomainWrite).mockReset().mockImplementation(async (_app, _call, options) => {
    await prepared.promise
    sendToWallet()
    options?.onUpdate?.({ status: 'awaiting_approval' } as DuskDomainTxState)
    await approved.promise
    options?.onUpdate?.({ status: 'submitted', txId } as DuskDomainTxState)
    return { status: 'executed', txId } as DuskDomainTxState
  })
  let submit!: ReturnType<typeof useDuskDomainWriter>
  function Probe() {
    submit = useDuskDomainWriter({ wallet, chainId: 'dusk:0', getWorkspaceToken: () => visit, liveDuskDomainsApp: {}, contracts: {}, onPendingConfirmation,
      writeAccess: createWriteAccess({mode:'live_ready',liveWritesEnabled:true}, {} as never, unpaused) })
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  const finished = vi.fn()
  const workspace = submit.captureWorkspace('alpha.dusk')
  const pending = submit('alpha.dusk', {} as never, { workspace, onUpdate }).then(state => { finished(); return state })
  prepared.resolve()
  await vi.waitFor(() => expect(sendToWallet).toHaveBeenCalledOnce())
  visit = null
  onUpdate.mockClear()
  expect(finished).not.toHaveBeenCalled()
  await expect(submit('beta.dusk', {} as never)).rejects.toThrow('pending wallet transaction')
  approved.resolve()
  const result = await pending
  expect(result).toMatchObject({ status: 'executed', txId })
  expect(workspace()).toBe(false)
  expect(onUpdate).not.toHaveBeenCalled()
  expect(onPendingConfirmation).toHaveBeenCalledWith({ name: 'alpha.dusk', state: { status: 'submitted', txId } })
  expect(onPendingConfirmation).toHaveBeenLastCalledWith(null)
  await expect(submit('beta.dusk', {} as never)).resolves.toMatchObject({ status: 'executed', txId })
})
