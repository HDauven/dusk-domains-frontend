import { contracts } from '../test/frozenFixtures'
// @vitest-environment happy-dom
import { act, useLayoutEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { RegistrationQuote } from '@duskdomains/sdk'
import { analyzeName, DEFAULT_FEE_CONFIG, listPendingNameReservations, namehashHex, registrationCommitWindow, userFacingErrorMessage } from '../names/internal'
import { RegistrationFlowStatus } from '../features/registration/RegistrationFlowStatus'
import { RegistrationStepPanel } from '../features/registration/flow/RegistrationStepPanel'
import { useRegistrationFeature, type UseRegistrationFeatureProps } from '../features/registration/useRegistrationFeature'
import { deriveRegistrationCapabilities } from './derived/registrationCapabilities'
import { findSavedReservation } from './derived/reservationState'
import { useRegistrationAppState } from './useRegistrationAppState'
import { useRegistrationRuntime } from './useRegistrationRuntime'
import { useSearchAppState } from './useSearchAppState'

// A reservation made under one policy, registered after a governance SetPolicy selected another.
const account = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'
const controller = `0x${'11'.repeat(32)}`
const connected = { generation: 1, status: 'connected', controller, address: account, chainId: 'dusk:0' }
type Session = typeof connected
const displayName = 'resume.dusk', nodeHex = namehashHex(displayName)
const getCurrentBlockHeight = async () => 100

function quote(policyByte: number, policyVersion: bigint, totalLux: string): RegistrationQuote {
  return {
    policy: Array(32).fill(policyByte), policy_version: policyVersion, total_lux: totalLux, height: 100n,
    quote: { version: 1, request_hash: Array(32).fill(1), config_version: 1n, registration_open: true, label_status: 'Public',
      base_lux: totalLux, premium_lux: '0', base_referral_bps: 2000, premium_referral_bps: 0, referral_lux: '0', valid_until: 100n },
  }
}
// Two years at 10 DUSK under the launch policy, then at 15 DUSK under its replacement.
const before = quote(2, 4n, '20000000000')
const after = quote(9, 5n, '30000000000')
const reviewedBefore = { years: 2, totalLux: '20000000000', policy: '02'.repeat(32), policyVersion: '4', configVersion: '1' }
const reviewedAfter = { years: 2, totalLux: '30000000000', policy: '09'.repeat(32), policyVersion: '5', configVersion: '1' }

type Call = { functionName: string; args: Record<string, unknown>; quote?: RegistrationQuote; reservedQuote?: unknown }
type Outcome = (call: Call) => Record<string, unknown>
// What the wallet write returns for each registration, in order; the commit always executes.
let outcomes: Outcome[] = []
const submitNameWrite = Object.assign(vi.fn(async (_name: string, call: Call, options: { beforeSign?: () => void; onUpdate?: (state: unknown) => void }) => {
  if (call.functionName === 'commit') {
    options.beforeSign?.()
    return { status: 'executed', txId: 'commit-tx' }
  }
  const state = { context: { title: displayName }, call: { contract: 'store', functionName: call.functionName }, ...(outcomes.shift()?.(call) ?? { status: 'executed', txId: 'register-tx' }) }
  options.onUpdate?.(state)
  return state
}), { captureSession: () => () => true, captureWorkspace: () => () => true })
const registrations = () => submitNameWrite.mock.calls.filter(([, call]) => call.functionName === 'complete_registration').map(([, call]) => call)
const commits = () => submitNameWrite.mock.calls.filter(([, call]) => call.functionName === 'commit')

// The quote the page shows, and what a fresh SDK quote returns now.
let live = before
const chain = {
  getPrimaryName: vi.fn(async () => ({ ok: true, value: null })),
  readPrimaryName: vi.fn(async () => ({ ok: true, value: null })),
  // The reservation is still on chain.
  getPendingCommitment: vi.fn(async () => ({ ok: true, value: { pending: { controller, createdAtBlock: 0 } } })),
  getRegistrationQuote: vi.fn(async () => ({ ok: true, value: { store: contracts.store.contractId, quote: after } })),
}
// What prepareFrozenCall reports when the fresh quote no longer matches the price shown or reserved at.
const priceChanged = (previousTotalLux: string, sinceReservation: boolean): Outcome => () => ({
  status: 'failed',
  message: 'The registration price changed. Your reservation is still valid.',
  error: Object.assign(new Error('The registration price changed. Your reservation is still valid.'), {
    name: 'RegistrationPriceChangedError', change: { previousTotalLux, sinceReservation, quote: after },
  }),
})
// The contract's refusal as the node reports it for an executed transaction.
const panic = (code: string) => `Panic { msg: "DuskDS:v1:${code}" }`
// Dusk Connect passes the node's execution event on as it arrived: without a JSON content type its
// payload stays bytes, and only the SDK reads the failure out of them.
const connectReceipt = (hash: string, err: string) => ({ hash, status: 'executed', ok: true, event: {
  headers: { 'content-type': 'application/octet-stream' },
  payload: new TextEncoder().encode(JSON.stringify({ err, gas_spent: 3_200_000 })),
} })

let root: Root, host: HTMLDivElement
let state: ReturnType<typeof useRegistrationAppState>
let feature: ReturnType<typeof useRegistrationFeature>

function Probe({ session }: { session: Session }) {
  const [walletError, setWalletError] = useState('')
  const registration = useRegistrationAppState(`${session.generation}:${session.chainId}:${session.address}`, session.address)
  const search = useSearchAppState(session.address)
  const runtime = useRegistrationRuntime({
    chainId: session.chainId, selectedAuthority: session.controller, selectedAddress: session.address,
    explicitlyDisconnected: session.status === 'disconnected',
    mainView: 'search', indexerClient: null, getCurrentBlockHeight,
    preparedCommit: registration.preparedCommit, setPreparedCommit: registration.setPreparedCommit,
    currentBlockHeight: search.currentBlockHeight, setCurrentBlockHeight: search.setCurrentBlockHeight, setNowSeconds: search.setNowSeconds,
  })
  const commitWindow = registrationCommitWindow(registration.preparedCommit?.committedBlockHeight, search.currentBlockHeight)
  const capabilities = deriveRegistrationCapabilities({
    ...registration, ...runtime, commitWindow, nodeHex, chainId: session.chainId,
    canRegister: true, commitBusy: false, txBusy: false, walletAuthorized: session.status === 'connected',
    selectedAuthority: session.controller, selectedAddress: session.address,
  })
  const result = { ...analyzeName(displayName), policyQuote: live, quotedYears: 2, totalFeeLux: Number(live.total_lux) }
  const common = new Proxy({
    displayName, nodeHex, result, canRegister: true, registrationFee: Number(live.total_lux) / 1e9, expiryDate: '1 Jan 2032',
    runtimeConfig: { chainId: session.chainId, contracts }, indexerClient: null,
    liveDuskDomainsApp: null, duskDomainsOnChainClient: chain, getCurrentBlockHeight,
    lifecycleBaseBlockHeight: search.currentBlockHeight ?? 100, feeConfig: DEFAULT_FEE_CONFIG,
    selectedAuthority: session.controller, selectedAddress: session.address, walletSetupState: session.status,
    commitBusy: false, txBusy: false, walletError, setWalletError, appliedReferral: null,
    submitNameWrite, ensureContractAuthorityForLiveWrite: () => true,
    ensurePublicBalanceForLiveWrite: async () => true, shouldApplyPreviewWriteFallback: async () => true,
    registrationTargetAddress: account, registrationTargetReady: true, registrationTargetAddressErrors: [],
  }, { get: (target, key) => key in target ? target[key as keyof typeof target] : vi.fn() })
  const current = useRegistrationFeature({
    activityFeed: common, appRuntime: common, domainRecordState: common, domainState: common,
    economicsRuntime: common, mainViewRuntime: common, namePreview: common, searchRuntime: common,
    walletRuntime: common, registrationState: registration, registrationRuntime: { ...common, ...runtime }, searchState: search,
    derivedState: { ...common, ...capabilities, commitWindow,
      savedReservation: findSavedReservation({ displayName, nodeHex, pendingReservations: runtime.pendingReservations }) },
  } as unknown as UseRegistrationFeatureProps)
  useLayoutEffect(() => { state = registration; feature = current })
  return <><RegistrationStepPanel {...current.registrationProps.step} /><RegistrationFlowStatus {...current.registrationProps.status} /></>
}

async function renderSession(session: Session) {
  sessionStorage.setItem(`dusk-domains:last-claim-owner:${session.chainId}`, session.controller)
  await act(async () => root.render(<Probe session={session} />))
  await settle()
}
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) })
const button = (name: string) => [...host.querySelectorAll('button')].find(button => button.textContent?.trim() === name)

async function reserve() {
  await renderSession(connected)
  await act(async () => { state.setDuration(2); state.setRegisterSetsPrimary(false) })
  await act(async () => feature.registrationProps.step.reservation.onPrepareCommit())
  await settle()
  expect(state.registrationStep).toBe('purchase')
  expect(commits()).toHaveLength(1)
  const [saved] = listPendingNameReservations()
  expect(saved.durationYears).toBe(2)
  return saved
}

async function register(name = 'Register') {
  const target = button(name)
  expect(target, `${name} button`).toBeDefined()
  expect(target!.disabled).toBe(false)
  await act(async () => target!.click())
  await settle()
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  localStorage.clear()
  sessionStorage.clear()
  outcomes = []
  live = before
  host = document.createElement('div')
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

it('offers the new price when the chain refuses a registration priced before a policy replacement, and registers the same reservation at it', async () => {
  const saved = await reserve()
  // The replacement executes while the registration waits for the network: QuoteChanged, payment returned.
  // The wallet stopped waiting, so the writer read the node's receipt, which records the refusal.
  outcomes.push(() => ({ status: 'failed', txId: 'refused-tx', blockHeight: 120, message: panic('QuoteChanged'),
    result: { hash: 'refused-tx', status: 'timeout', ok: false, error: 'Timed out waiting for tx execution (refused-tx…)' } }))
  await register()
  expect(chain.getRegistrationQuote).toHaveBeenCalledWith(displayName, 2, controller)
  expect(host.textContent).toContain('The registration price changed from 20 DUSK to 30 DUSK')
  expect(host.textContent).toContain('Your payment was returned; only the network fee was charged.')
  expect(host.textContent).toContain('Your reservation is still valid for about')
  expect(host.textContent).not.toContain('QuoteChanged')
  expect(listPendingNameReservations()).toEqual([saved])
  await register('Register at 30 DUSK')
  const [, repriced] = registrations()
  expect(repriced).toMatchObject({ quote: after, reservedQuote: reviewedAfter,
    args: { commitment: saved.commitment, secret: saved.secret, commitmentStore: saved.commitmentStore, feeLux: 30e9, durationYears: 2 } })
  expect(commits()).toHaveLength(1)
  expect(state.registrationCompletion?.status).toBe('executed')
  expect(listPendingNameReservations()).toEqual([])
})

it.each(['QuoteChanged', 'FeeMismatch'])('reads a %s refusal from a receipt whose payload arrived as bytes, and offers the new price', async code => {
  const saved = await reserve()
  // Only the receipt names the refusal: the SDK found the failure in its bytes, and there is no error message.
  outcomes.push(() => ({ status: 'failed', txId: 'refused-tx', result: connectReceipt('refused-tx', panic(code)) }))
  await register()
  expect(chain.getRegistrationQuote).toHaveBeenCalledWith(displayName, 2, controller)
  expect(host.textContent).toContain('The registration price changed from 20 DUSK to 30 DUSK before your registration was confirmed, so it was refused.')
  expect(host.textContent).toContain('Your payment was returned; only the network fee was charged.')
  await register('Register at 30 DUSK')
  expect(registrations()[1]).toMatchObject({ quote: after, args: { commitment: saved.commitment, feeLux: 30e9 } })
  expect(commits()).toHaveLength(1)
  expect(state.registrationCompletion?.status).toBe('executed')
})

it('says the payment was returned when the wallet reports the chain’s refusal as an error, and registers at the new price', async () => {
  const saved = await reserve()
  // The wallet's wait for execution rejected with the node's error. The writer shows its own copy
  // for it; the raw error still names the refusal.
  const error = new Error(`Transaction failed: ${panic('QuoteChanged')}`)
  outcomes.push(() => ({ status: 'failed', txId: 'refused-tx', message: userFacingErrorMessage(error), error }))
  await register()
  expect(chain.getRegistrationQuote).toHaveBeenCalledWith(displayName, 2, controller)
  expect(host.textContent).toContain('The registration price changed from 20 DUSK to 30 DUSK before your registration was confirmed, so it was refused.')
  expect(host.textContent).toContain('Your payment was returned; only the network fee was charged.')
  expect(listPendingNameReservations()).toEqual([saved])
  await register('Register at 30 DUSK')
  expect(registrations()[1]).toMatchObject({ quote: after, args: { commitment: saved.commitment, feeLux: 30e9 } })
  expect(commits()).toHaveLength(1)
  expect(state.registrationCompletion?.status).toBe('executed')
})

it('says the price changed, without a refund, when preparation finds it before any wallet request', async () => {
  const saved = await reserve()
  // SetPolicy executed between preparation reading the registration context and quoting: the store
  // refuses that read-only quote, so preparation fails before the wallet is asked. Nothing was paid.
  const error = new Error(`Contract read failed: ${panic('QuoteChanged')}`)
  outcomes.push(() => ({ status: 'failed', message: userFacingErrorMessage(error), error }))
  await register()
  expect(host.textContent).toContain('The registration price changed. Review the new price and try again.')
  expect(host.textContent).not.toMatch(/returned|refused/i)
  expect(chain.getRegistrationQuote).not.toHaveBeenCalled()
  expect(button('Register at 30 DUSK')).toBeUndefined()
  expect(listPendingNameReservations()).toEqual([saved])
})

it('neither reprices nor claims a refund when a submitted registration times out', async () => {
  const saved = await reserve()
  // A timeout proves nothing about execution, whatever the wallet's tracking error mentions.
  outcomes.push(() => ({ status: 'timeout', txId: 'pending-tx', result: { hash: 'pending-tx', status: 'timeout', ok: false,
    error: `Unable to track tx execution: ${panic('QuoteChanged')}` } }))
  await register()
  expect(chain.getRegistrationQuote).not.toHaveBeenCalled()
  expect(host.textContent).not.toMatch(/returned|refused/i)
  expect(button('Register at 30 DUSK')).toBeUndefined()
  expect(listPendingNameReservations()).toEqual([saved])
})

it('offers the new price when it changed before signing, without a wallet request, and registers the same reservation at it', async () => {
  const saved = await reserve()
  // The page still shows the old price; preparation re-quotes, finds the replacement and stops before the wallet.
  outcomes.push(priceChanged('20000000000', false))
  await register()
  expect(registrations()).toHaveLength(1)
  // The price the reservation was made at went with the request, for preparation to compare.
  expect(registrations()[0]).toMatchObject({ quote: before, reservedQuote: reviewedBefore, args: { feeLux: 20e9 } })
  expect(host.textContent).toContain('The registration price changed from 20 DUSK to 30 DUSK.')
  expect(host.textContent).toContain('Your reservation is still valid for about')
  expect(host.textContent).not.toContain('payment was returned')
  expect(host.textContent).not.toContain('On-chain terms changed')
  // The price change carries the fresh SDK quote; nothing else is read.
  expect(chain.getRegistrationQuote).not.toHaveBeenCalled()
  await register('Register at 30 DUSK')
  const [, confirmed] = registrations()
  expect(confirmed).toMatchObject({ quote: after, reservedQuote: reviewedAfter,
    args: { commitment: saved.commitment, secret: saved.secret, commitmentStore: saved.commitmentStore, feeLux: 30e9 } })
  expect(commits()).toHaveLength(1)
  expect(state.registrationCompletion?.status).toBe('executed')
})

it('names the price a reservation was made at after a reload, and keeps the confirmed price for the next try', async () => {
  const saved = await reserve()
  // A reload after the replacement: the claim resumes from the saved reservation and quotes the new policy.
  live = after
  await renderSession({ ...connected, generation: 2 })
  expect(state.preparedCommit).toMatchObject({ commitment: saved.commitment, secret: saved.secret })
  // The page already quotes a newer policy selection than the reservation's, so it says so before Register.
  expect(host.textContent).toContain('The registration price changed from 20 DUSK to 30 DUSK since you reserved this name.')
  expect(host.textContent).toContain('Your reservation is still valid for about')
  expect(button('Register')).toBeUndefined()
  expect(registrations()).toEqual([])
  // Confirmed, then rejected in the wallet: the reservation now keeps the confirmed price.
  outcomes.push(() => ({ status: 'rejected' }))
  await register('Register at 30 DUSK')
  expect(registrations()[0]).toMatchObject({ quote: after, reservedQuote: reviewedAfter,
    args: { commitment: saved.commitment, secret: saved.secret, commitmentStore: saved.commitmentStore, feeLux: 30e9 } })
  await renderSession({ ...connected, generation: 3 })
  expect(host.textContent).not.toContain('since you reserved this name')
  await register()
  expect(registrations()[1]).toMatchObject({ quote: after, reservedQuote: reviewedAfter, args: { commitment: saved.commitment, feeLux: 30e9 } })
  expect(commits()).toHaveLength(1)
  expect(state.registrationCompletion?.status).toBe('executed')
})

it('does not sign from a saved reservation’s Register when its price changed, and waits for the new price to be confirmed', async () => {
  const saved = await reserve()
  live = after
  await act(async () => { state.searchActions.reset(); state.searchActions.resume(saved, { register: true }) })
  await settle()
  await settle()
  expect(registrations()).toEqual([])
  expect(host.textContent).toContain('since you reserved this name')
  await register('Register at 30 DUSK')
  expect(registrations()).toHaveLength(1)
  expect(registrations()[0]).toMatchObject({ quote: after, reservedQuote: reviewedAfter, args: { commitment: saved.commitment, feeLux: 30e9 } })
  expect(state.registrationCompletion?.status).toBe('executed')
})

it('says plainly why the chain refused a registration for another reason, and keeps the reservation', async () => {
  const saved = await reserve()
  outcomes.push(() => ({ status: 'failed', txId: 'refused-tx', message: 'Panic: DuskDS:v1:CommitmentAge' }))
  await register()
  expect(chain.getRegistrationQuote).not.toHaveBeenCalled()
  expect(host.textContent).toContain('The reservation is outside its reveal window. Check its current status.')
  expect(host.textContent).not.toContain('DuskDS')
  expect(button('Register at 30 DUSK')).toBeUndefined()
  expect(listPendingNameReservations()).toEqual([saved])
})
