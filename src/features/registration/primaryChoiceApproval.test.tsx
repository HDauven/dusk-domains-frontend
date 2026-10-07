import { contracts } from '../../test/frozenFixtures'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { listPendingNameReservations, namehashHex, type DuskDomainTxState } from '../../names/internal'
import { useRegistrationFeature, type UseRegistrationFeatureProps } from './useRegistrationFeature'
import type { PreparedRegistrationCommit } from './usePendingReservations'
import { RegistrationFlowPanel } from './RegistrationFlowPanel'
import { readReservationPrimaryChoice } from './reservationPrimaryChoice'

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
    options.beforeSign()
    options.onUpdate({status:'awaiting_approval'})
    return approval.promise
  })
  Object.assign(submitNameWrite, { captureSession: () => () => true, captureWorkspace: () => () => true })
  const props = new Proxy({ registerSetsPrimary, setRegisterSetsPrimary, setPreparedCommit, setCommitTxState, submitNameWrite,
    displayName: 'approval.dusk', nodeHex: namehashHex('approval.dusk'), duration: 1,
    selectedAuthority: `0x${'11'.repeat(32)}`, selectedAddress: 'wallet', canPrepareCommit: true,
    runtimeConfig: { chainId: 'dusk:0', contracts }, liveDuskDomainsApp: null, preparedCommit: null as PreparedRegistrationCommit | null,
    commitBusy: false, txBusy: false, registrationCompletion: null, resultIssues: [], registrationStep: 'review',
    registrationTargetAddress: 'wallet', registrationTargetAddressErrors: [], registrationFee: 10,
    ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: () => balance.promise,
    loadPendingReservations: () => listPendingNameReservations(),
    searchActions: { resume: vi.fn() },
    result: { issues: [] },
  }, { get: (target, key) => key in target ? target[key as keyof typeof target] : vi.fn() })
  let feature!: ReturnType<typeof useRegistrationFeature>
  function Probe({ current = props }: { current?: typeof props }) {
    feature = useRegistrationFeature({
      activityFeed: current, appRuntime: current, derivedState: current,
      domainRecordState: current, domainState: current, economicsRuntime: current,
      mainViewRuntime: current, namePreview: current, registrationRuntime: current,
      registrationState: current, searchRuntime: current, searchState: current, walletRuntime: current,
    } as unknown as UseRegistrationFeatureProps)
    return null
  }
  renderToStaticMarkup(<Probe />)
  const step = feature.registrationProps.step
  step.reservation.onPrepareCommit()
  step.primaryChoice.onRegisterSetsPrimaryChange(!registerSetsPrimary)
  expect(setRegisterSetsPrimary).not.toHaveBeenCalled() // Locked even during balance preflight.
  balance.resolve(true)
  await vi.waitFor(() => expect(submitNameWrite).toHaveBeenCalledOnce())
  const saved = listPendingNameReservations()[0]
  expect(saved).toBeDefined()
  expect(setPreparedCommit).not.toHaveBeenCalled()
  step.primaryChoice.onRegisterSetsPrimaryChange(!registerSetsPrimary)
  expect(setRegisterSetsPrimary).not.toHaveBeenCalled()

  renderToStaticMarkup(<Probe current={{...props, commitBusy: true}} />)
  const html = renderToStaticMarkup(<RegistrationFlowPanel {...feature.registrationProps} />)
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*role="switch"|<button[^>]*role="switch"[^>]*disabled=""/)
  feature.registrationProps.step.primaryChoice.onRegisterSetsPrimaryChange(!registerSetsPrimary)
  expect(setRegisterSetsPrimary).not.toHaveBeenCalled()
  approval.resolve({status:'executed',txId:'commit'} as DuskDomainTxState)
  await vi.waitFor(() => expect(setPreparedCommit).toHaveBeenCalledOnce())
  expect(readReservationPrimaryChoice(saved)).toBe(registerSetsPrimary)
  renderToStaticMarkup(<Probe current={{...props, preparedCommit: saved}} />)
  expect(feature.registrationProps.step.primaryChoice.primaryChoiceLocked).toBe(false)
  feature.registrationProps.step.primaryChoice.onRegisterSetsPrimaryChange(!registerSetsPrimary)
  expect(readReservationPrimaryChoice(saved)).toBe(!registerSetsPrimary)
})
