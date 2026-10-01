import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useIndexerWriteFallback } from '../../app/useIndexerWriteFallback'
import { afterEach, expect, it, vi } from 'vitest'
import { deriveRecordCapabilities } from '../../app/derived/recordCapabilities'
import { saveDomainRecords } from './saveDomainRecords'

it('lets a valid inline edit save without a public-record checkbox or typed name', () => {
  const props = { walletAuthorized:true, selectedAddress:'wallet', activeRecordTarget:{node:'child',name:'pay.alpha.dusk'}, recordDraftMutations:[{action:'set',key:'moonlight_address',value:'address'}], recordDraftErrors:[], recordBusy:false } as unknown as Parameters<typeof deriveRecordCapabilities>[0]
  expect(deriveRecordCapabilities(props).canSaveRecords).toBe(true)
  expect(deriveRecordCapabilities({...props,recordDraftErrors:['Invalid address']}).canSaveRecords).toBe(false)
  expect(deriveRecordCapabilities({...props,walletAuthorized:false}).canSaveRecords).toBe(false)
})

it('saves to the open name and clears drafts after a live indexer refresh', async () => {
  const submitNameWrite=Object.assign(vi.fn().mockResolvedValue({status:'executed'}), { captureWorkspace: () => () => true })
  const setRecordDrafts=vi.fn()
  const props={activeRecordTarget:{node:'child',name:'pay.alpha.dusk'},nodeHex:'child',canSaveRecords:true,
    recordDraftMutations:[{action:'set',key:'website',value:'https://example.test'}],recordDraftErrors:[],runtimeConfig:{contracts:{}},
    ensureContractAuthorityForLiveWrite:()=>true,ensurePublicBalanceForLiveWrite:async()=>true,
    submitNameWrite,setRecordDrafts,setRecordError:vi.fn(),setRecordTxState:vi.fn(),shouldApplyPreviewWriteFallback:async()=>false,
  } as unknown as Parameters<typeof saveDomainRecords>[0]
  expect(await saveDomainRecords(props)).toBe(true)
  expect(submitNameWrite.mock.calls[0][0]).toBe('pay.alpha.dusk')
  expect(submitNameWrite.mock.calls[0][1].args.node).toBe('child')
  expect(setRecordDrafts).toHaveBeenCalledWith({})
  submitNameWrite.mockResolvedValueOnce({status:'rejected'})
  setRecordDrafts.mockClear()
  expect(await saveDomainRecords(props)).toBeUndefined()
  expect(setRecordDrafts).not.toHaveBeenCalled()
})

afterEach(() => vi.useRealTimers())

it.each(['offline', 'stale', 'missing', 'refresh failed', 'confirmed'])('keeps a live edit until the indexer confirms and refreshes it: %s', async outcome => {
  vi.useFakeTimers()
  const mutations = [{action:'set',key:'website',value:'https://saved.test'}]
  const resolveForward = vi.fn(async () => {
    if (outcome === 'offline') throw new Error('offline')
    return {records:outcome === 'stale' ? [] : mutations}
  })
  const refreshCurrentNameFromIndexer = vi.fn(async () => outcome !== 'refresh failed')
  let fallback!: ReturnType<typeof useIndexerWriteFallback>
  function Probe() {
    fallback = useIndexerWriteFallback({ displayName: 'alpha.dusk', indexerClient: outcome === 'missing' ? null : {resolveForward} as never,
      liveDuskDomainsApp:{} as never, refreshCurrentNameFromIndexer,
      setIndexerError:vi.fn(), setIndexerConfirmation:vi.fn() })
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  const setRecordDrafts = vi.fn(), setRecordError = vi.fn()
  const pending = saveDomainRecords({ activeRecordTarget:{node:'node',name:'alpha.dusk'}, nodeHex:'node',canSaveRecords:true,
    recordDraftMutations:mutations, recordDraftErrors:[],runtimeConfig:{contracts:{}},
    ensureContractAuthorityForLiveWrite:()=>true,ensurePublicBalanceForLiveWrite:async()=>true,
    submitNameWrite:Object.assign(async()=>({status:'executed'}), { captureWorkspace: () => () => true }),setRecordDrafts,setRecordError,setRecordTxState:vi.fn(),
    shouldApplyPreviewWriteFallback:fallback,
  } as never)
  if (outcome === 'offline' || outcome === 'stale') {
    await vi.advanceTimersByTimeAsync(0)
    expect(setRecordDrafts).not.toHaveBeenCalled()
    expect(setRecordError).toHaveBeenLastCalledWith('Saved on chain, still confirming. Keep this draft until confirmation completes.')
  }
  await vi.runAllTimersAsync()
  expect(await pending).toBe(outcome === 'confirmed')
  if (outcome === 'confirmed') expect(setRecordDrafts).toHaveBeenCalledExactlyOnceWith({})
  else {
    expect(setRecordDrafts).not.toHaveBeenCalled()
    expect(setRecordError).toHaveBeenLastCalledWith('Saved on chain, still confirming. Keep this draft until confirmation completes.')
  }
  if (outcome === 'offline' || outcome === 'stale') expect(resolveForward).toHaveBeenCalledTimes(15)
})

it('preserves the next workspace when navigation happens during the indexer confirmation', async () => {
  const confirmed = Promise.withResolvers<{ records: { key: string; value: string }[] }>()
  const refresh = vi.fn(async () => true)
  let current = true
  let fallback!: ReturnType<typeof useIndexerWriteFallback>
  const feedback = vi.fn()
  function Probe() {
    fallback = useIndexerWriteFallback({ displayName: 'alpha.dusk', liveDuskDomainsApp: {} as never,
      indexerClient: { resolveForward: () => confirmed.promise } as never,
      refreshCurrentNameFromIndexer: refresh, setIndexerError: feedback, setIndexerConfirmation: feedback })
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  const setRecordDrafts = vi.fn(), setRecordError = vi.fn()
  const pending = saveDomainRecords({ activeRecordTarget:{name:'alpha.dusk',node:'node'},canSaveRecords:true,
    recordDraftMutations:[{action:'set',key:'website',value:'https://a.test'}],runtimeConfig:{contracts:{}},
    ensureContractAuthorityForLiveWrite:()=>true,ensurePublicBalanceForLiveWrite:async()=>true,
    submitNameWrite:Object.assign(async()=>({status:'executed'}), { captureWorkspace: () => () => current }),
    setRecordError,setRecordDrafts,setRecordTxState:vi.fn(),shouldApplyPreviewWriteFallback:fallback,
  } as never)
  await vi.waitFor(() => expect(feedback).toHaveBeenCalledWith('Waiting for Dusk Domains to confirm record update.'))
  current = false
  feedback.mockClear()
  setRecordError.mockClear()
  confirmed.resolve({records:[{key:'website',value:'https://a.test'}]})
  await pending
  expect(refresh).not.toHaveBeenCalled()
  expect(feedback).not.toHaveBeenCalled()
  expect(setRecordDrafts).not.toHaveBeenCalled()
  expect(setRecordError).not.toHaveBeenCalled()
})
