import { contracts } from '../test/frozenFixtures'
// @vitest-environment happy-dom
import { act, useLayoutEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { analyzeName, DEFAULT_FEE_CONFIG, listPendingNameReservations, namehashHex, registrationCommitWindow } from '../names/internal'
import * as registrationCall from '../features/registration/completeRegistrationCall'
import { RegistrationFlowStatus } from '../features/registration/RegistrationFlowStatus'
import { RegistrationStepPanel } from '../features/registration/flow/RegistrationStepPanel'
import { useRegistrationFeature, type UseRegistrationFeatureProps } from '../features/registration/useRegistrationFeature'
import { deriveRegistrationCapabilities } from './derived/registrationCapabilities'
import { findSavedReservation } from './derived/reservationState'
import { useRegistrationAppState } from './useRegistrationAppState'
import { useRegistrationRuntime } from './useRegistrationRuntime'
import { useSearchAppState } from './useSearchAppState'

const account = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'
const controller = `0x${'11'.repeat(32)}`
const connected = { generation: 1, status: 'connected', controller, address: account, chainId: 'dusk:0' }
type Session = typeof connected
const displayName = 'resume.dusk', nodeHex = namehashHex(displayName)
const getCurrentBlockHeight = async () => 100
const onView = vi.fn()
const submitNameWrite = Object.assign(vi.fn(async (_name, _call, options) => {
  options.beforeSign?.()
  return { status: 'executed', txId: 'tx' }
}), { captureSession: () => () => true, captureWorkspace: () => () => true })
let root: Root, host: HTMLDivElement
let state: ReturnType<typeof useRegistrationAppState>
let feature: ReturnType<typeof useRegistrationFeature>

function Probe({ session }: { session: Session }) {
  const registration = useRegistrationAppState(`${session.generation}:${session.chainId}:${session.address}`)
  const search = useSearchAppState(session.address)
  const runtime = useRegistrationRuntime({
    chainId: session.chainId, selectedAuthority: session.controller, selectedAddress: session.address,
    explicitlyDisconnected: session.status === 'disconnected',
    mainView: 'search', indexerClient: null, getCurrentBlockHeight,
    preparedCommit: registration.preparedCommit, setPreparedCommit: registration.setPreparedCommit,
    setCurrentBlockHeight: search.setCurrentBlockHeight, setNowSeconds: search.setNowSeconds,
  })
  const commitWindow = registrationCommitWindow(registration.preparedCommit?.committedBlockHeight, search.currentBlockHeight)
  const capabilities = deriveRegistrationCapabilities({
    ...registration, ...runtime, commitWindow, nodeHex, chainId: session.chainId,
    canRegister: true, commitBusy: false, txBusy: false, walletAuthorized: session.status === 'connected',
    selectedAuthority: session.controller, selectedAddress: session.address,
  })
  const common = new Proxy({
    displayName, nodeHex, result: analyzeName(displayName), canRegister: true,
    runtimeConfig: { chainId: session.chainId, contracts }, indexerClient: null,
    liveDuskDomainsApp: null, duskDomainsOnChainClient: null, getCurrentBlockHeight,
    lifecycleBaseBlockHeight: search.currentBlockHeight ?? 100, feeConfig: DEFAULT_FEE_CONFIG,
    selectedAuthority: session.controller, selectedAddress: session.address, walletSetupState: session.status,
    commitBusy: false, txBusy: false, walletError: '', appliedReferral: null,
    submitNameWrite, ensureContractAuthorityForLiveWrite: () => true,
    ensurePublicBalanceForLiveWrite: async () => true, shouldApplyPreviewWriteFallback: async () => true,
    handleMainViewChange: onView,
  }, { get: (target, key) => key in target ? target[key as keyof typeof target] : vi.fn() })
  const current = useRegistrationFeature({
    activityFeed: common, appRuntime: common, domainRecordState: common, domainState: common,
    economicsRuntime: common, mainViewRuntime: common, namePreview: common, searchRuntime: common,
    walletRuntime: common, registrationState: registration, registrationRuntime: runtime, searchState: search,
    derivedState: { ...common, ...capabilities, commitWindow,
      savedReservation: findSavedReservation({ displayName, nodeHex, pendingReservations: runtime.pendingReservations }) },
  } as unknown as UseRegistrationFeatureProps)
  useLayoutEffect(() => { state = registration; feature = current })
  return <><RegistrationStepPanel {...current.registrationProps.step} /><RegistrationFlowStatus {...current.registrationProps.status} /></>
}

async function renderSession(session: Session) {
  sessionStorage.setItem(`dusk-domains:last-claim-owner:${session.chainId}`, session.controller)
  await act(async () => root.render(<Probe session={session} />))
}

async function reserve() {
  await renderSession(connected)
  await act(async () => { state.setDuration(2); state.setRegisterSetsPrimary(false) })
  await act(async () => feature.registrationProps.step.reservation.onPrepareCommit())
  expect(state.registrationStep).toBe('purchase')
  expect(state.committed).toBe(true)
  expect(feature.registrationProps.step.purchase.canRevealRegistration).toBe(true)
  expect(submitNameWrite).toHaveBeenCalledOnce()
  const [saved] = listPendingNameReservations()
  expect(saved.secret).toBe(state.preparedCommit?.secret)
  return saved
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  localStorage.clear()
  sessionStorage.clear()
  host = document.createElement('div')
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

it.each(['locked', 'disconnected', 'connected'])('continues the saved claim after a %s wallet session reconnects to the same account', async status => {
  const buildReveal = vi.spyOn(registrationCall, 'createCompleteRegistrationRequest')
  const saved = await reserve()
  const oldUpdate = state.searchActions.updateCommit
  if (status !== 'connected') {
    await renderSession({ ...connected, generation: 2, status, controller: '', address: '' })
    expect(state.preparedCommit).toBeNull()
    expect(state.committed).toBe(false)
  }
  expect(buildReveal).not.toHaveBeenCalled()
  await renderSession({ ...connected, generation: 3 })
  expect(state.preparedCommit).toMatchObject({ commitment: saved.commitment, secret: saved.secret,
    controller, ownerAddress: account, chainId: connected.chainId })
  expect(state).toMatchObject({ committed: true, registrationStep: 'purchase', duration: 2, registerSetsPrimary: false })
  await act(async () => oldUpdate({ ...saved, secret: 'stale-secret' }))
  expect(state.preparedCommit?.secret).toBe(saved.secret)
  const register = [...host.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Register')!
  expect(register.disabled).toBe(false)
  await act(async () => register.click())
  expect(buildReveal).toHaveBeenCalledOnce()
  expect(buildReveal.mock.calls[0][0]).toMatchObject({ preparedCommit: { commitment: saved.commitment, secret: saved.secret },
    selectedAddress: account, selectedAuthority: controller, duration: 2, registerSetsPrimary: false })
  expect(submitNameWrite).toHaveBeenCalledTimes(2)
  expect(state.registrationCompletion?.status).toBe('executed')
  expect(listPendingNameReservations()).toEqual([])
})

it.each([
  { controller: `0x${'22'.repeat(32)}`, address: 'another-account' },
  { address: 'another-account' },
  { chainId: 'dusk:1' },
])('offers recovery without building a reveal when the session changes to %j', async change => {
  const buildReveal = vi.spyOn(registrationCall, 'createCompleteRegistrationRequest')
  const saved = await reserve()
  await renderSession({ ...connected, ...change, generation: 2 })
  expect(state.preparedCommit).toBeNull()
  expect(state.committed).toBe(false)
  expect(feature.registrationProps.step.purchase.canRevealRegistration).toBe(false)
  expect(host.textContent).toContain('My names')
  const recovery = [...host.querySelectorAll('button')].find(button => button.textContent === 'View')!
  expect(recovery.disabled).toBe(false)
  await act(async () => recovery.click())
  expect(onView).toHaveBeenCalledExactlyOnceWith('my-names')
  await act(async () => feature.registrationProps.step.purchase.onRegisterName())
  expect(buildReveal).not.toHaveBeenCalled()
  expect(submitNameWrite).toHaveBeenCalledOnce()
  expect(listPendingNameReservations()).toEqual([saved])
})
