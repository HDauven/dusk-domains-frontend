// @vitest-environment happy-dom
import { act, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import type { DuskDomainsIndexerClient } from '../../names/internal'
import { RegistrationSummary } from './RegistrationSummary'
import { useRegistrationAppState } from '../../app/useRegistrationAppState'
import { claimSetsPrimary, primaryNameNote, revealSetsPrimary, useWalletPrimary, useWalletPrimaryName, type WalletPrimary } from './walletPrimary'

afterEach(() => vi.unstubAllGlobals())
const text = (html: string) => html.replaceAll('&#x27;', '\'').replaceAll('<!-- -->', '')

const ready = (name: string | null, stored: string | null): WalletPrimary => ({ status: 'ready', name, stored })

it('turns the primary name on by default only for a wallet that has none', () => {
  const claim = 'brumeline.dusk'
  expect(claimSetsPrimary(null, ready(null, null), claim)).toBe(true)
  // Registering a second name must not silently replace the first one's primary name.
  expect(claimSetsPrimary(null, ready('vorn.dusk', 'vorn.dusk'), claim)).toBe(false)
  // A link that isn't working as a primary name may work again, after a renewal for instance.
  expect(claimSetsPrimary(null, ready(null, 'old.dusk'), claim)).toBe(false)
  // Registering a dropped name again clears every link to it and to its old subnames.
  expect(claimSetsPrimary(null, ready(null, claim), claim)).toBe(true)
  expect(claimSetsPrimary(null, ready(null, `pay.${claim}`), claim)).toBe(true)
  expect(claimSetsPrimary(null, ready(null, `x${claim}`), claim)).toBe(false)
  // Until the wallet's primary name is known, nothing is replaced.
  expect(claimSetsPrimary(null, { status: 'loading', name: null, stored: null }, claim)).toBe(false)
  expect(claimSetsPrimary(null, { status: 'unknown', name: null, stored: null }, claim)).toBe(false)
  // A choice someone made stands.
  expect(claimSetsPrimary(true, ready('vorn.dusk', 'vorn.dusk'), claim)).toBe(true)
  expect(claimSetsPrimary(false, ready(null, null), claim)).toBe(false)
})

it('says what the claim does to the wallet\'s primary name, calling only a working one a primary name', () => {
  const claim = 'brumeline.dusk'
  const note = (primary: WalletPrimary, on: boolean) => primaryNameNote(primary, on, claim)
  expect(note(ready(null, null), true)).toBe('')
  expect(note({ status: 'loading', name: null, stored: null }, false)).toBe('')
  expect(note(ready('vorn.dusk', 'vorn.dusk'), false)).toBe('Your primary name is vorn.dusk.')
  expect(note(ready('vorn.dusk', 'vorn.dusk'), true)).toBe('This replaces vorn.dusk as your primary name.')
  expect(note(ready(null, 'old.dusk'), false)).toBe('Your Dusk address is still linked to old.dusk, which isn\'t working as a primary name.')
  expect(note(ready(null, 'old.dusk'), true)).toBe('This replaces your Dusk address\'s link to old.dusk.')
  expect(note(ready(null, claim), true)).toBe('This makes brumeline.dusk your primary name again.')
  expect(note(ready(null, claim), false)).toBe('Registering clears your Dusk address\'s link to brumeline.dusk.')
  expect(note(ready(null, `pay.${claim}`), true)).toBe('This replaces your Dusk address\'s link to pay.brumeline.dusk.')
  expect(note(ready(null, `pay.${claim}`), false)).toBe('Registering clears your Dusk address\'s link to pay.brumeline.dusk.')
})

it('reads the connected wallet\'s primary name again for each claim, and keeps only the latest', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const answers: Record<string, (value: string | null) => void> = {}
  const getPrimaryName = vi.fn((endpoint: { value: string }) => new Promise<string | null>(resolve => { answers[`${endpoint.value}:${getPrimaryName.mock.calls.length}`] = resolve }))
  const client = { getPrimaryName } as unknown as DuskDomainsIndexerClient
  let seen: WalletPrimary | null = null
  function Probe({ address, claim }: { address: string; claim: string }) {
    const primary = useWalletPrimaryName(client, null, address, claim)
    useLayoutEffect(() => { seen = primary })
    return null
  }
  document.body.innerHTML = '<div id="root"></div>'
  const root = createRoot(document.getElementById('root')!)
  await act(async () => root.render(<Probe address="viktor" claim="vorn.dusk" />))
  expect(seen).toEqual({ status: 'loading', name: null, stored: null })
  expect(getPrimaryName).toHaveBeenLastCalledWith({ type: 'moonlight_address', value: 'viktor' })
  await act(async () => answers['viktor:1'](null))
  expect(seen).toEqual({ status: 'ready', name: null, stored: null })
  // After vorn.dusk became primary, the next claim reads it.
  await act(async () => root.render(<Probe address="viktor" claim="brumeline.dusk" />))
  expect(seen).toEqual({ status: 'loading', name: null, stored: null })
  await act(async () => answers['viktor:2']('vorn.dusk'))
  expect(seen).toEqual({ status: 'ready', name: 'vorn.dusk', stored: null })
  // A failed read is not taken for "no primary name".
  getPrimaryName.mockRejectedValueOnce(new Error('Indexer unavailable'))
  await act(async () => root.render(<Probe address="viktor" claim="velmora.dusk" />))
  expect(seen).toEqual({ status: 'unknown', name: null, stored: null })
  // No wallet, or nothing to claim: no read.
  await act(async () => root.render(<Probe address="" claim="velmora.dusk" />))
  expect(seen).toEqual({ status: 'unknown', name: null, stored: null })
  await act(async () => root.render(<Probe address="viktor" claim="" />))
  expect(seen).toEqual({ status: 'unknown', name: null, stored: null })
  expect(getPrimaryName).toHaveBeenCalledTimes(3)
  await act(async () => root.unmount())
})

it('reads the verified and the stored primary name from the chain when it can, and waits for both', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let answerVerified!: (result: unknown) => void, answerStored!: (result: unknown) => void
  const client = { getPrimaryName: vi.fn() } as unknown as DuskDomainsIndexerClient
  const chain = {
    getPrimaryName: vi.fn(() => new Promise(resolve => { answerVerified = resolve })),
    readPrimaryName: vi.fn(() => new Promise(resolve => { answerStored = resolve })),
  }
  let seen: WalletPrimary | null = null
  function Probe({ claim }: { claim: string }) {
    const primary = useWalletPrimaryName(client, chain as never, 'viktor', claim)
    useLayoutEffect(() => { seen = primary })
    return null
  }
  document.body.innerHTML = '<div id="root"></div>'
  const root = createRoot(document.getElementById('root')!)
  await act(async () => root.render(<Probe claim="brumeline.dusk" />))
  // old.dusk is still stored for the address, but doesn't resolve.
  await act(async () => answerVerified({ ok: true, value: null }))
  expect(seen).toEqual({ status: 'loading', name: null, stored: null })
  await act(async () => answerStored({ ok: true, value: { name: 'old.dusk' } }))
  expect(seen).toEqual({ status: 'ready', name: null, stored: 'old.dusk' })
  expect(chain.getPrimaryName).toHaveBeenCalledWith({ type: 'moonlight_address', value: 'viktor' })
  expect(chain.readPrimaryName).toHaveBeenCalledWith({ type: 'moonlight_address', value: 'viktor' })
  // The indexer can lag behind the chain, so it isn't asked.
  expect(client.getPrimaryName).not.toHaveBeenCalled()
  // A failed read is not taken for "no primary name".
  await act(async () => root.render(<Probe claim="velmora.dusk" />))
  await act(async () => { answerVerified({ ok: false, error: { message: 'Node unavailable' } }); answerStored({ ok: true, value: null }) })
  expect(seen).toEqual({ status: 'unknown', name: null, stored: null })
  // Nor is a primary name set between the two reads, which only the verified read saw.
  await act(async () => root.render(<Probe claim="aurelia.dusk" />))
  await act(async () => { answerVerified({ ok: true, value: 'alpha.dusk' }); answerStored({ ok: true, value: null }) })
  expect(seen).toEqual({ status: 'ready', name: 'alpha.dusk', stored: 'alpha.dusk' })
  await act(async () => root.unmount())
})

it('reads the primary name again on request and shows that read, unless the claim changed meanwhile', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const answers: Array<(value: string | null) => void> = []
  const getPrimaryName = vi.fn(() => new Promise<string | null>(resolve => { answers.push(resolve) }))
  const client = { getPrimaryName } as unknown as DuskDomainsIndexerClient
  let seen!: ReturnType<typeof useWalletPrimary>
  function Probe({ claim }: { claim: string }) {
    const primary = useWalletPrimary(client, null, 'viktor', claim)
    useLayoutEffect(() => { seen = primary })
    return null
  }
  document.body.innerHTML = '<div id="root"></div>'
  const root = createRoot(document.getElementById('root')!)
  await act(async () => root.render(<Probe claim="beta.dusk" />))
  await act(async () => answers[0](null))
  expect(seen.primary).toEqual({ status: 'ready', name: null, stored: null })
  // Register reads again, and the switch shows what that read found.
  let fresh!: Promise<WalletPrimary>
  await act(async () => { fresh = seen.readFresh() })
  await act(async () => answers[1]('alpha.dusk'))
  expect(await fresh).toEqual({ status: 'ready', name: 'alpha.dusk', stored: null })
  expect(seen.primary).toEqual({ status: 'ready', name: 'alpha.dusk', stored: null })
  // A read for a claim left behind doesn't replace the next claim's.
  await act(async () => { fresh = seen.readFresh() })
  await act(async () => root.render(<Probe claim="gamma.dusk" />))
  await act(async () => answers[3](null))
  await act(async () => answers[2]('alpha.dusk'))
  await fresh
  expect(seen.primary).toEqual({ status: 'ready', name: null, stored: null })
  await act(async () => root.unmount())
})

it('keeps a primary-name choice for its wallet account only, through a lock and unlock', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let state!: ReturnType<typeof useRegistrationAppState>
  function Probe({ session, address }: { session: string; address: string }) {
    const value = useRegistrationAppState(session, address)
    useLayoutEffect(() => { state = value })
    return null
  }
  document.body.innerHTML = '<div id="root"></div>'
  const root = createRoot(document.getElementById('root')!)
  await act(async () => root.render(<Probe session="1:viktor" address="viktor" />))
  // Viktor turns it off, on a wallet with no primary name.
  await act(async () => state.setRegisterSetsPrimary(false))
  expect(state.registerSetsPrimary).toBe(false)
  // Every wallet event starts a new session; while locked there is no address.
  await act(async () => root.render(<Probe session="2:" address="" />))
  expect(state.registerSetsPrimary).toBeNull()
  // Unlocked, his choice is still his.
  await act(async () => root.render(<Probe session="3:viktor" address="viktor" />))
  expect(state.registerSetsPrimary).toBe(false)
  // Another account starts again from its own default.
  await act(async () => root.render(<Probe session="4:maya" address="maya" />))
  expect(state.registerSetsPrimary).toBeNull()
  // A resumed reservation brings the choice saved for its owner.
  const reservation = { controller: 'maya-id', ownerAddress: 'maya', chainId: 'dusk:0', commitment: 'commit', secret: 'secret', committedBlockHeight: 10, committedTxId: 'tx', durationYears: 1 }
  const { saveReservationPrimaryChoice } = await import('./reservationPrimaryChoice')
  saveReservationPrimaryChoice(reservation, true)
  await act(async () => state.searchActions.resume(reservation as never))
  expect(state.registerSetsPrimary).toBe(true)
  await act(async () => root.unmount())
})

const summary = (registerSetsPrimary: boolean, primaryNote: string) => text(renderToStaticMarkup(<RegistrationSummary committed={false}
  registrationComplete={false} selectedAddress="viktor"
  quote={{ duration: 1, expiryDate: '2027-10-11', feeConfigError: '', onChangeTerm: vi.fn(), registrationFee: 10, registrationTargetAddress: 'viktor' }}
  referral={{ activeReferral: null, appliedReferral: null }}
  primaryChoice={{ onRegisterSetsPrimaryChange: vi.fn(), registerSetsPrimary, primaryNote }} />))

it('says what a primary name does beside the switch, and what the claim does to the current one', () => {
  const first = summary(true, '')
  expect(first).toContain('Apps that support .dusk names can show this name instead of your Dusk address.</dd>')
  expect(first).toMatch(/role="switch"[^>]*aria-describedby="[^"]+"|aria-describedby="[^"]+"[^>]*role="switch"/)
  expect(summary(false, 'Your primary name is vorn.dusk.')).toContain('Apps that support .dusk names can show this name instead of your Dusk address. Your primary name is vorn.dusk.</dd>')
})

it.each([
  [null, null, true, ''],
  ['vorn.dusk', 'vorn.dusk', false, 'Your primary name is vorn.dusk.'],
  // Viktor registers his dropped primary name again.
  [null, 'brumeline.dusk', true, 'This makes brumeline.dusk your primary name again.'],
] as const)('shows the default for a wallet whose primary name is %j (stored %j), and keeps it a default through Reserve', async (current, stored, expected, note) => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) })
  const { useRegistrationFeature } = await import('./useRegistrationFeature')
  const { readReservationPrimaryChoice } = await import('./reservationPrimaryChoice')
  const { listPendingNameReservations, namehashHex } = await import('../../names/internal')
  const { contracts } = await import('../../test/frozenFixtures')
  const submitNameWrite = Object.assign(vi.fn(async (_name: string, _call: unknown, options: { beforeSign: () => void }) => {
    options.beforeSign()
    return { status: 'executed', txId: 'commit' }
  }), { captureSession: () => () => true, captureWorkspace: () => () => true })
  const setPreparedCommit = vi.fn(), setRegisterSetsPrimary = vi.fn()
  const props = new Proxy({ registerSetsPrimary: null, setRegisterSetsPrimary, setPreparedCommit, submitNameWrite, setCommitTxState: vi.fn(),
    indexerClient: { getPrimaryName: vi.fn(async () => current) },
    duskDomainsOnChainClient: { getPrimaryName: vi.fn(async () => ({ ok: true, value: current })), readPrimaryName: vi.fn(async () => ({ ok: true, value: stored ? { name: stored } : null })) },
    displayName: 'brumeline.dusk', nodeHex: namehashHex('brumeline.dusk'), duration: 1,
    selectedAuthority: `0x${'11'.repeat(32)}`, selectedAddress: 'viktor', canPrepareCommit: true, canRegister: true,
    runtimeConfig: { chainId: 'dusk:0', contracts }, liveDuskDomainsApp: null, preparedCommit: null,
    commitBusy: false, txBusy: false, registrationCompletion: null, registrationStep: 'review',
    registrationTargetAddress: 'viktor', registrationTargetAddressErrors: [], registrationFee: 10,
    ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
    loadPendingReservations: () => listPendingNameReservations(), searchActions: { resume: vi.fn() }, result: { issues: [] },
  }, { get: (target, key) => key in target ? target[key as keyof typeof target] : vi.fn() })
  let feature!: ReturnType<typeof useRegistrationFeature>
  function Probe() {
    const value = useRegistrationFeature({ activityFeed: props, appRuntime: props, derivedState: props, domainRecordState: props, domainState: props,
      economicsRuntime: props, mainViewRuntime: props, namePreview: props, registrationRuntime: props, registrationState: props,
      searchRuntime: props, searchState: props, walletRuntime: props } as never)
    useLayoutEffect(() => { feature = value })
    return null
  }
  document.body.innerHTML = '<div id="root"></div>'
  const root = createRoot(document.getElementById('root')!)
  await act(async () => root.render(<Probe />))
  expect(feature.registrationProps.step.primaryChoice).toMatchObject({ registerSetsPrimary: expected, primaryNote: note })
  await act(async () => feature.registrationProps.step.reservation.onPrepareCommit())
  // A default isn't a choice: Register reads the primary name again and decides from that read.
  expect(setRegisterSetsPrimary).not.toHaveBeenCalled()
  await vi.waitFor(() => expect(setPreparedCommit).toHaveBeenCalledOnce())
  expect(readReservationPrimaryChoice(listPendingNameReservations()[0])).toBeNull()
  await act(async () => root.unmount())
})

it('lets Register set the primary name only as a read made for it allows', () => {
  const claim = 'beta.dusk'
  const none = ready(null, null), alpha = ready('alpha.dusk', 'alpha.dusk')
  const loading: WalletPrimary = { status: 'loading', name: null, stored: null }, unread: WalletPrimary = { status: 'unknown', name: null, stored: null }
  const shown = (setsPrimary: boolean, primary: WalletPrimary) => ({ setsPrimary, primary })
  const asked = (note: string) => ({ ask: `${note} Press Register again to confirm, or turn off Primary name.` })
  // A default follows the new read, whatever the page showed, so it never replaces a primary name.
  expect(revealSetsPrimary(null, none, claim)).toEqual({ setsPrimary: true })
  expect(revealSetsPrimary(null, alpha, claim)).toEqual({ setsPrimary: false })
  expect(revealSetsPrimary(null, alpha, claim, shown(true, none))).toEqual({ setsPrimary: false })
  expect(revealSetsPrimary(null, unread, claim, shown(true, none))).toEqual({ setsPrimary: false })
  // A link the claim clears anyway is no replacement.
  expect(revealSetsPrimary(null, ready(null, claim), claim)).toEqual({ setsPrimary: true })
  // Off as shown stays off, even where the default is now on.
  expect(revealSetsPrimary(null, none, claim, shown(false, loading))).toEqual({ setsPrimary: false })
  expect(revealSetsPrimary(false, none, claim)).toEqual({ setsPrimary: false })
  // Turned on, it sets a primary name where none would be replaced.
  expect(revealSetsPrimary(true, none, claim)).toEqual({ setsPrimary: true })
  expect(revealSetsPrimary(true, ready(null, `pay.${claim}`), claim, shown(true, loading))).toEqual({ setsPrimary: true })
  // It replaces one only when Register was pressed while the note named it.
  expect(revealSetsPrimary(true, alpha, claim, shown(true, alpha))).toEqual({ setsPrimary: true })
  expect(revealSetsPrimary(true, ready(null, 'old.dusk'), claim, shown(true, ready(null, 'old.dusk')))).toEqual({ setsPrimary: true })
  expect(revealSetsPrimary(true, alpha, claim)).toEqual(asked('This replaces alpha.dusk as your primary name.'))
  expect(revealSetsPrimary(true, alpha, claim, shown(true, none))).toEqual(asked('This replaces alpha.dusk as your primary name.'))
  expect(revealSetsPrimary(true, alpha, claim, shown(true, loading))).toEqual(asked('This replaces alpha.dusk as your primary name.'))
  expect(revealSetsPrimary(true, ready('gamma.dusk', 'gamma.dusk'), claim, shown(true, alpha))).toEqual(asked('This replaces gamma.dusk as your primary name.'))
  expect(revealSetsPrimary(true, ready(null, 'old.dusk'), claim)).toEqual(asked('This replaces your Dusk address\'s link to old.dusk.'))
  // Without a read, a choice to turn it on can't be checked.
  expect(revealSetsPrimary(true, unread, claim, shown(true, unread))).toEqual({ ask: 'Can\'t check your wallet\'s primary name. Try again, or turn off Primary name to register without it.' })
})

it('saves only a choice someone made with the reservation', async () => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) })
  const { readReservationPrimaryChoice, saveReservationPrimaryChoice } = await import('./reservationPrimaryChoice')
  const reservation = { chainId: 'dusk:0', commitment: 'commit' }
  const key = 'dusk-domains.claim-primary:dusk:0:commit'
  expect(readReservationPrimaryChoice(reservation)).toBeNull()
  saveReservationPrimaryChoice(reservation, true)
  expect(readReservationPrimaryChoice(reservation)).toBe(true)
  saveReservationPrimaryChoice(reservation, false)
  expect(readReservationPrimaryChoice(reservation)).toBe(false)
  saveReservationPrimaryChoice(reservation, null)
  expect(data.has(key)).toBe(false)
  // Earlier versions saved the switch with its default, which was on: "true" may not have been chosen.
  data.set(key, 'true')
  expect(readReservationPrimaryChoice(reservation)).toBeNull()
  data.set(key, 'false')
  expect(readReservationPrimaryChoice(reservation)).toBe(false)
})
