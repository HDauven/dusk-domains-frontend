import { contracts, reservation } from '../../test/frozenFixtures'
import * as names from '../../names/internal'
import { readReservationPrimaryChoice } from './reservationPrimaryChoice'
import { searchActions } from '../search/test-fixtures/searchActions'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { deriveRegistrationCapabilities } from '../../app/derived/registrationCapabilities'
import { DEFAULT_FEE_CONFIG, listPendingNameReservations, namehashHex, registrationCommitWindow, upsertPendingNameReservation,
  type DuskDomainTxState } from '../../names/internal'
import { completeRegistration } from './completeRegistrationAction'
import { prepareRegistrationCommit } from './prepareRegistrationCommit'
import { forgetPendingReservation } from '../search/actions/forgetPendingReservation'
import { openPendingReservation } from '../search/actions/openPendingReservation'
import { RegistrationPurchaseStep } from './RegistrationPurchaseStep'
import { RegistrationReviewStep } from './RegistrationReviewStep'
import { refreshCommitBlockStateFromIndexer } from './pendingReservationSync'
import type { PreparedRegistrationCommit } from './pendingReservationTypes'
import { restartStrandedReservation } from './strandedReservation'

vi.mock('../search/searchControllerReset', () => ({ resetSearchState: vi.fn() }))

const controller = `0x${'11'.repeat(32)}`
function args() {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value) })
  const noop = () => {}
  return {
    canPrepareCommit: true, displayName: 'resume.dusk', nodeHex: namehashHex('resume.dusk'), duration: 1,
    selectedAddress: 'owner', selectedAuthority: controller, runtimeConfig: { chainId: 'dusk:0', contracts },
    liveDuskDomainsApp: {client:Promise.resolve({getName:async()=>({store:contracts.store.contractId})})}, indexerClient: null, loadPendingReservations: () => listPendingNameReservations(),
    ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
    getCurrentBlockHeight: async () => 500, setCommitTxState: noop, setWalletError: vi.fn(),
    setRegistrationCompletion: noop, setPreparedCommit: noop, setCurrentBlockHeight: noop,
    setRegisterSetsPrimary: noop,
    setNowSeconds: noop, setCommitted: noop, setRegistrationStep: noop, setTxState: noop,
    setIndexerError: noop, setIndexerConfirmation: noop,
  }
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

it.each([true, false])('preserves the primary name choice %s when an uncertain claim is saved', async (registerSetsPrimary) => {
  const props = args()
  await prepareRegistrationCommit({ ...props, registerSetsPrimary,
    submitNameWrite: Object.assign(async (_name: unknown, _call: unknown, options: { beforeSign: () => void; onUpdate: (state: unknown) => void }) => {
      options.beforeSign()
      options.onUpdate({ status: 'awaiting_approval' })
      return { status: 'failed' }
    }, { captureSession: () => () => true, captureWorkspace: () => () => true }),
  } as never)
  const saved = listPendingNameReservations()[0]
  expect(readReservationPrimaryChoice(saved)).toBe(registerSetsPrimary)
})

it('saves before wallet approval and preserves the secret while a confirmed height read stalls', async () => {
  const props = args()
  const height = Promise.withResolvers<number>()
  let secretBeforeApproval: string | undefined
  const submitNameWrite = vi.fn(async (_name, _call, options) => {
    options.beforeSign()
    options.onUpdate({ status: 'awaiting_approval' })
    secretBeforeApproval = listPendingNameReservations()[0]?.secret
    return { status: 'executed', txId: 'confirmed-tx' } as DuskDomainTxState
  })
  Object.assign(submitNameWrite, { captureSession: () => () => true, captureWorkspace: () => () => true })
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
    committedBlockHeight: null, committedTxId: 'confirmed-tx' })
})

it('fails before broadcast if storage fails or a previous uncertain reservation exists', async () => {
  const props = args()
  const broadcast = vi.fn()
  const submitNameWrite = async (_name: unknown, _call: unknown, options: { beforeSign: () => void; onUpdate: (state: unknown) => void }) => {
    options.beforeSign()
    options.onUpdate({ status: 'awaiting_approval' })
    broadcast()
    return { status: 'failed' }
  }
  Object.assign(submitNameWrite, { captureSession: () => () => true, captureWorkspace: () => () => true })
  await prepareRegistrationCommit({ ...props, submitNameWrite } as never)
  const saved = listPendingNameReservations()[0]
  expect(saved?.secret).toBeTruthy() // A disconnected transport is not proof that nothing broadcast.
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

it('does not call an uncertain saved request signed or submitted after reopening Purchase and Review', async () => {
  const props = args()
  const submitNameWrite = vi.fn(async (_name, _call, options) => {
    options.beforeSign()
    options.onUpdate({ status: 'awaiting_approval' })
    return { status: 'failed' }
  })
  Object.assign(submitNameWrite, { captureSession: () => () => true, captureWorkspace: () => () => true })
  await prepareRegistrationCommit({ ...props, submitNameWrite } as never)
  const saved = listPendingNameReservations()[0]
  expect(saved).toMatchObject({ committedBlockHeight: null, committedTxId: null })
  const updateCommit = vi.fn(), resume = vi.fn()
  let currentBlockHeight: number | null = null
  const noop = () => {}
  const getCommitment = vi.fn(async () => null)
  await openPendingReservation({ ...props, chainId: 'dusk:0',
    ...searchActions({ registration: { resume, updateCommit }, search: { updateClock: height => { currentBlockHeight = height } } }),
    openSearchView: noop, beginNameRead: () => () => true, hydrateNameFromIndexer: noop,
    indexerClient: { getCommitment, getHealth: async () => ({ ok: true, currentBlockHeight: 500 }),
      searchName: async () => ({ canonical: saved.name, status: 'available' }) } } as never, saved)
  expect(getCommitment).toHaveBeenCalledExactlyOnceWith(saved.commitment, controller)
  expect(resume).toHaveBeenCalledExactlyOnceWith(saved)
  // Resuming the flow does not prove a broadcast.
  const commitWindow = registrationCommitWindow(updateCommit.mock.calls.at(-1)?.[0].committedBlockHeight, currentBlockHeight)
  expect(commitWindow.status).toBe('missing')
  const view = {
    wallet: { walletSetupState: 'connected' },
    reservation: { committed: true, commitWindow, canPrepareCommit: false, commitBusy: false, commitStale: false, commitTxState: null },
    purchase: { canRevealRegistration: false, txBusy: false, txState: null, registrationCompletion: null },
  }
  const html = renderToStaticMarkup(createElement(RegistrationPurchaseStep, view as never))
    + renderToStaticMarkup(createElement(RegistrationReviewStep, view as never))
  expect(html).toContain('Unconfirmed')
  expect(html).toContain('Request saved')
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
    submitNameWrite: Object.assign(async (_name: unknown, _call: unknown, options: { beforeSign: () => void; onUpdate: (state: unknown) => void }) => {
      options.beforeSign()
      options.onUpdate({ status: 'awaiting_approval' })
      vi.setSystemTime(startedAt + 90_000)
      return { status: 'executed', txId: 'confirmed-after-long-approval' }
    }, { captureSession: () => () => true, captureWorkspace: () => () => true }) } as never)
  const saved = listPendingNameReservations()[0]
  expect(saved).toMatchObject({ committedBlockHeight: null, committedTxId: 'confirmed-after-long-approval' })
  const getCommitment = vi.fn(async () => null)
  await refreshCommitBlockStateFromIndexer({ chainId: 'dusk:0', commitment: saved.commitment,
    getCurrentBlockHeight, selectedAuthority: controller, setPreparedCommit,
    setCurrentBlockHeight: height => { state.height = height }, loadPendingReservations: props.loadPendingReservations,
    indexerClient: { getHealth: async () => ({ ok: true, currentBlockHeight: 500 }), getCommitment } as never })
  expect(getCommitment).toHaveBeenCalledExactlyOnceWith(saved.commitment, controller)
  expect(state.height).toBe(500)
  expect(listPendingNameReservations()[0].committedBlockHeight).toBeNull()
  expect(state.prepared?.committedBlockHeight).toBeNull()
  expect(registrationCommitWindow(state.prepared?.committedBlockHeight, state.height).status).toBe('missing')
  expect(saved.createdAt).toBe(new Date(startedAt).toISOString())
  expect(saved.updatedAt).toBe(new Date(startedAt + 90_000).toISOString())
})

// A reservation whose commit is confirmed and old enough to reveal.
function readyReservation(getPendingCommitment: () => Promise<unknown>) {
  const props = args()
  const saved = reservation({ownerAddress:'owner',committedTxId:'old-commit'})
  upsertPendingNameReservation(saved)
  return { saved, props: { ...props, canRegister: true, committed: true, registrationTargetReady: true,
    registrationTargetAddressErrors: [], commitWindow: { status: 'ready', waitBlocks: 0, staleInBlocks: 100 },
    preparedCommit: { controller, ownerAddress: 'owner', chainId: 'dusk:0', commitment: saved.commitment, secret: saved.secret, committedBlockHeight: 100, committedTxId: 'old-commit' },
    duskDomainsOnChainClient: { getPendingCommitment: vi.fn(getPendingCommitment) }, setStrandedCommitment: vi.fn(),
    submitNameWrite: Object.assign(vi.fn(async () => ({ status: 'failed' })), { captureSession: () => () => true, captureWorkspace: () => () => true }), result: { label: 'resume' }, feeConfig: DEFAULT_FEE_CONFIG,
    lifecycleBaseBlockHeight: 500, registerSetsPrimary: false, appliedReferral: null,
    registrationTargetAddress: '244Sywxj7PuMHpcPxemaXLcrY5rPgztra6H9Vz8cU1Ro5v23SxKTfVqr2yS7NXAXE1iq59ndn4aMZmYxuzu3Te3e9fokQKTUkYvFxYg2P2E8EEg1gWUbs3AFL2aNx62HQd7r' } }
}

it.each(['controller', 'address', 'chain'])('never reveals a reservation secret through another session: %s', async mismatch => {
  const { props } = readyReservation(async () => ({ ok: true, value: null }))
  const accountB = `0x${'55'.repeat(32)}`

  await completeRegistration({ ...props,
    selectedAddress: mismatch === 'address' ? 'account-b-address' : props.selectedAddress,
    selectedAuthority: mismatch === 'controller' ? accountB : props.selectedAuthority,
    runtimeConfig: { ...props.runtimeConfig, chainId: mismatch === 'chain' ? 'dusk:3' : 'dusk:0' },
  } as never)

  expect(props.submitNameWrite).not.toHaveBeenCalled()
})

it('aborts reservation preparation if preflight changes the initiating profile', async () => {
  const props = args()
  const accountB = `0x${'66'.repeat(32)}`
  let liveAuthority = controller
  let submitted: { call: unknown, signer: string } | null = null
  const submitNameWrite = Object.assign(vi.fn(async (
    _name: unknown,
    call: unknown,
    options: { beforeSign: () => void },
  ) => {
    submitted = { call, signer: liveAuthority }
    options.beforeSign()
    return { status: 'failed' }
  }), {
    captureSession: () => { const initial = liveAuthority; return () => initial === liveAuthority },
    captureWorkspace: () => () => true,
  })

  await prepareRegistrationCommit({
    ...props,
    ensurePublicBalanceForLiveWrite: async () => {
      liveAuthority = accountB
      return true
    },
    submitNameWrite,
  } as never)

  expect(liveAuthority).toBe(accountB)
  expect(submitted).toBeNull()
  expect(listPendingNameReservations()).toEqual([])
})

it('reserves again instead of revealing where a registry added since the commit never saw it', async () => {
  const { props, saved } = readyReservation(async () => ({ ok: true, value: { commitment: `0x${'22'.repeat(32)}`, pending: null } }))
  await completeRegistration(props as never)
  expect(props.duskDomainsOnChainClient.getPendingCommitment).toHaveBeenCalledExactlyOnceWith(controller, saved.commitment, 'resume.dusk')
  expect(props.submitNameWrite).not.toHaveBeenCalled()
  const stranded = { controller, commitment: saved.commitment }
  expect(props.setStrandedCommitment).toHaveBeenCalledExactlyOnceWith(stranded)
  expect(listPendingNameReservations()).toEqual([saved]) // Kept until the user reserves again.

  const capabilities = deriveRegistrationCapabilities({ ...props, chainId: 'dusk:0', commitBusy: false, txBusy: false, walletAuthorized: true,
    nodeHex: props.nodeHex, registrationCompletion: null, strandedCommitment: stranded } as never)
  expect(capabilities).toMatchObject({ canRevealRegistration: false, canRestartReservation: true, reservationStranded: true })
  const html = renderToStaticMarkup(createElement(RegistrationPurchaseStep, {
    reservation: { commitWindow: props.commitWindow, canRestartReservation: capabilities.canRestartReservation, reservationStranded: capabilities.reservationStranded },
    wallet: { walletSetupState: 'connected' },
    purchase: { canRevealRegistration: capabilities.canRevealRegistration, registrationCompletion: null, txBusy: false, txState: null },
  } as never)).replaceAll('&#x27;', '\'')
  expect(html).toContain('Dusk Domains added capacity since you reserved, so this reservation can\'t be completed.')
  expect(html).toContain('Reserve again')
  expect(html).not.toContain('Register name')

  const submitNameWrite = vi.fn(async (_name, _call, options) => {
    options.beforeSign()
    options.onUpdate({ status: 'awaiting_approval' })
    return { status: 'executed', txId: 'new-commit' } as DuskDomainTxState
  })
  Object.assign(submitNameWrite, { captureSession: () => () => true, captureWorkspace: () => () => true })
  await restartStrandedReservation({ ...props, ...capabilities, submitNameWrite } as never)
  expect(submitNameWrite).toHaveBeenCalledOnce()
  expect(submitNameWrite.mock.calls[0][1]).toMatchObject({ functionName: 'commit' })
  const reservations = listPendingNameReservations()
  expect(reservations).toHaveLength(1)
  expect(reservations[0].commitment).not.toBe(saved.commitment)
  expect(reservations[0]).toMatchObject({ name: 'resume.dusk', committedBlockHeight: null, committedTxId: 'new-commit' })
  expect(props.setStrandedCommitment).toHaveBeenLastCalledWith(null)
})

it('never judges or replaces another account’s reservation, from A to B and back to A', async () => {
  const { props, saved } = readyReservation(async () => ({ ok: true, value: { commitment: `0x${'22'.repeat(32)}`, pending: null } }))
  // Reserved by A (controller); B has no such commitment on chain.
  const accountB = `0x${'55'.repeat(32)}`
  let stranded: unknown = null
  const asB = { ...props, selectedAuthority: accountB, setStrandedCommitment: vi.fn((value) => { stranded = value }) }
  await completeRegistration(asB as never)
  expect(props.duskDomainsOnChainClient.getPendingCommitment).not.toHaveBeenCalled()
  expect(asB.setStrandedCommitment).not.toHaveBeenCalled()
  expect(props.submitNameWrite).not.toHaveBeenCalled() // Keep A's secret out of B's wallet.

  const capabilities = (selectedAuthority: string, strandedCommitment: unknown) => deriveRegistrationCapabilities({
    ...props, chainId: 'dusk:0', commitBusy: false, txBusy: false, walletAuthorized: true, registrationCompletion: null,
    selectedAuthority, strandedCommitment } as never)
  expect(capabilities(controller, stranded)).toMatchObject({ canRevealRegistration: true, reservationStranded: false })
  // A stranded commitment found by one account never carries over to another.
  const strandedForB = { controller: accountB, commitment: saved.commitment }
  expect(capabilities(accountB, strandedForB)).toMatchObject({ canRevealRegistration: false, reservationStranded: true })
  expect(capabilities(controller, strandedForB))
    .toMatchObject({ canRevealRegistration: true, canRestartReservation: false, reservationStranded: false })

  // Reserve again removes only the connected account's own reservation.
  const commit = vi.fn()
  await restartStrandedReservation({ ...asB, canRestartReservation: true, submitNameWrite: commit } as never)
  expect(commit).not.toHaveBeenCalled()
  expect(listPendingNameReservations()).toEqual([saved])
})

it('reveals as before when the commitment is where the reveal goes, or cannot be read', async () => {
  for (const read of [
    { ok: true, value: { commitment: `0x${'22'.repeat(32)}`, pending: { controller, createdAtBlock: 100 } } },
    { ok: false, error: { code: 'contract_read_failed', message: 'offline' } },
  ]) {
    const { props, saved } = readyReservation(async () => read)
    await completeRegistration(props as never)
    expect(props.submitNameWrite).toHaveBeenCalledExactlyOnceWith('resume.dusk',
      expect.objectContaining({ functionName: 'complete_registration' }), expect.anything())
    expect(props.setStrandedCommitment).not.toHaveBeenCalled()
    expect(listPendingNameReservations()).toEqual([saved])
  }
})

it('keeps the saved reservation after an executed reveal until the name shows as registered', async () => {
  const pending = async () => ({ ok: true, value: { commitment: `0x${'22'.repeat(32)}`, pending: { controller, createdAtBlock: 100 } } })
  const noop = () => {}
  const reveal = (shouldApplyPreviewWriteFallback: unknown) => {
    const { props } = readyReservation(pending)
    return { ...props, shouldApplyPreviewWriteFallback, submitNameWrite: Object.assign(vi.fn(async () => ({ status: 'executed', txId: 'reveal' })), { captureSession: () => () => true, captureWorkspace: () => () => true }),
      setManagedName: noop, setResolverRecordSets: noop, setPrimaryName: noop, setPrimaryEndpointValue: noop,
      setDraftOwner: noop, setDraftManager: noop, appendActivity: noop }
  }
  // Live writes wait for the index; a wallet can call a reverted reveal executed.
  const indexed = (owner: string | null) => vi.fn(async (_description: string, check: (client: unknown) => Promise<boolean>) => {
    await check({ searchName: async () => ({ status: owner ? 'registered' : 'available' }),
      getNameState: async () => owner && { owner, manager: owner, resolverId: 'resolver' } })
    return false
  })

  const reverted = reveal(indexed(null))
  await completeRegistration(reverted as never)
  expect(reverted.submitNameWrite).toHaveBeenCalledOnce()
  expect(reverted.shouldApplyPreviewWriteFallback).toHaveBeenCalledOnce()
  expect(listPendingNameReservations()).toHaveLength(1)
  const otherOwner = reveal(indexed(`0x${'44'.repeat(32)}`))
  await completeRegistration(otherOwner as never)
  expect(listPendingNameReservations()).toHaveLength(1)

  await completeRegistration(reveal(indexed(controller)) as never)
  expect(listPendingNameReservations()).toEqual([])
  // Without live writes nothing is waited for, as before.
  await completeRegistration(reveal(async () => true) as never)
  expect(listPendingNameReservations()).toEqual([])
})

it('aborts before secret generation when registry routing changes the initiating session', async () => {
  const props = args()
  let current = true
  const routing = vi.spyOn(names, 'registrationRegistry').mockImplementationOnce(async () => { current = false; return null })
  const secret = vi.spyOn(names, 'createRegistrationSecret')
  const submitNameWrite = Object.assign(vi.fn(), { captureWorkspace: () => () => true, captureSession: () => () => current })
  try {
    await prepareRegistrationCommit({ ...props, submitNameWrite } as never)
    expect(routing).toHaveBeenCalledOnce()
    expect(secret).not.toHaveBeenCalled()
    expect(submitNameWrite).not.toHaveBeenCalled()
    expect(listPendingNameReservations()).toEqual([])
  } finally { routing.mockRestore(); secret.mockRestore() }
})

it.each(['commitment lookup', 'balance'])('aborts reveal when %s changes the initiating session', async step => {
  let current = true
  const { props } = readyReservation(async () => {
    if (step === 'commitment lookup') current = false
    return { ok: false, error: { message: 'offline' } }
  })
  Object.assign(props.submitNameWrite, { captureSession: () => () => current })
  await completeRegistration({ ...props, ensurePublicBalanceForLiveWrite: async () => { current = false; return true } } as never)
  expect(props.submitNameWrite).not.toHaveBeenCalled()
})
