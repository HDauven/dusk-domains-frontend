import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { listPendingNameReservations, namehashHex, type DuskDomainTxState } from '../../names/internal'
import { useRegistrationFeature, type UseRegistrationFeatureProps } from './useRegistrationFeature'
import { RegistrationFlowPanel } from './RegistrationFlowPanel'
import { readReservationPrimaryChoice } from './reservationPrimaryChoice'
import { openPendingReservation } from '../search/actions/openPendingReservation'

vi.mock('../search/searchControllerReset', () => ({ resetSearchState: vi.fn() }))
afterEach(() => vi.unstubAllGlobals())

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

it.each([true, false])('locks primary choice %s before approval and recovers that choice', async registerSetsPrimary => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value) })
  const balance = deferred<boolean>(), approval = deferred<DuskDomainTxState>()
  const setRegisterSetsPrimary = vi.fn(), setPreparedCommit = vi.fn(), setCommitTxState = vi.fn()
  const submitNameWrite = vi.fn(async (_name, _call, options) => {
    options.onUpdate({status:'awaiting_approval'})
    return approval.promise
  })
  const props = new Proxy({ registerSetsPrimary, setRegisterSetsPrimary, setPreparedCommit, setCommitTxState, submitNameWrite,
    displayName: 'approval.dusk', nodeHex: namehashHex('approval.dusk'), duration: 1,
    selectedAuthority: `0x${'11'.repeat(32)}`, selectedAddress: 'wallet', canPrepareCommit: true,
    runtimeConfig: { chainId: 'dusk:0', contracts: {} }, liveDuskDomainsApp: null, preparedCommit: null,
    commitBusy: false, txBusy: false, registrationCompletion: null, resultIssues: [], registrationStep: 'review',
    registrationTargetAddress: 'wallet', registrationTargetAddressErrors: [], registrationFee: 10,
    ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: () => balance.promise,
    loadPendingReservations: () => listPendingNameReservations(),
  }, { get: (target, key) => key in target ? target[key as keyof typeof target] : vi.fn() }) as unknown as UseRegistrationFeatureProps
  let feature!: ReturnType<typeof useRegistrationFeature>
  function Probe({ current = props }: { current?: UseRegistrationFeatureProps }) {
    feature = useRegistrationFeature(current)
    return null
  }
  renderToStaticMarkup(<Probe />)
  const step = feature.registrationProps.step
  step.onPrepareCommit()
  step.onRegisterSetsPrimaryChange(!registerSetsPrimary)
  expect(setRegisterSetsPrimary).not.toHaveBeenCalled() // Locked even during balance preflight.
  balance.resolve(true)
  await vi.waitFor(() => expect(submitNameWrite).toHaveBeenCalledOnce())
  const saved = listPendingNameReservations()[0]
  expect(saved).toBeDefined()
  expect(setPreparedCommit).not.toHaveBeenCalled()
  step.onRegisterSetsPrimaryChange(!registerSetsPrimary)
  expect(setRegisterSetsPrimary).not.toHaveBeenCalled()

  renderToStaticMarkup(<Probe current={{...props, commitBusy: true} as UseRegistrationFeatureProps} />)
  const html = renderToStaticMarkup(<RegistrationFlowPanel {...feature.registrationProps} />)
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*role="switch"|<button[^>]*role="switch"[^>]*disabled=""/)
  feature.registrationProps.step.onRegisterSetsPrimaryChange(!registerSetsPrimary)
  expect(setRegisterSetsPrimary).not.toHaveBeenCalled()
  approval.resolve({status:'executed',txId:'commit'} as DuskDomainTxState)
  await vi.waitFor(() => expect(setPreparedCommit).toHaveBeenCalledOnce())
  const setters = new Proxy({}, {get: () => vi.fn()})
  const recovery = new Proxy({ chainId:'dusk:0', setRegisterSetsPrimary, indexerClient:null, beginNameRead:()=>()=>true,
    getCurrentBlockHeight:async()=>null }, {get: (target,key) => key in target ? target[key as keyof typeof target] : Reflect.get(setters,key)})
  await openPendingReservation(recovery as never, saved)
  expect(setRegisterSetsPrimary).toHaveBeenLastCalledWith(registerSetsPrimary)
  renderToStaticMarkup(<Probe current={{...props, preparedCommit: saved} as UseRegistrationFeatureProps} />)
  expect(feature.registrationProps.step.primaryChoiceLocked).toBe(false)
  feature.registrationProps.step.onRegisterSetsPrimaryChange(!registerSetsPrimary)
  expect(readReservationPrimaryChoice(saved)).toBe(!registerSetsPrimary)
})
