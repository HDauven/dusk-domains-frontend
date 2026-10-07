import { contracts } from '../test/frozenFixtures'
import { storeCommitCall } from '@duskdomains/sdk'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { DuskWalletUserRejectedError } from '@dusk/connect'
import { WalletSessionChangedError } from '../features/wallet/sessionWriteWallet'
import { storeCommitRequest, listPendingNameReservations, namehashHex } from '../names/internal'
import { prepareRegistrationCommit } from '../features/registration/prepareRegistrationCommit'
import { saveDomainRecords } from '../features/domains/saveDomainRecords'
import { createWriteAccess } from './writeAccess'
import { unpaused } from './operatorPause'
import { useDuskDomainWriter } from './useDuskDomainWriter'

const wallet = { state: { installed: true, authorized: true, chainId: 'dusk:0', profiles: [{ account: 'owner', profileId: 'primary' }], selectedProfile: { account: 'owner', profileId: 'primary' } } as import('@dusk/connect').DuskWalletState }



afterEach(() => vi.unstubAllGlobals())

function fixture(session = wallet, nodeUrl?: string) {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) })
  let visit = { name: 'alpha.dusk' }
  const app = {
    get chainId() { return session.state.chainId ?? undefined },
    prepareIntent: async () => storeCommitCall(contracts.store.contractId,{hash:Array(32).fill(1)}),
    readContract: vi.fn(async () => null), prepareContractCall: vi.fn(async (): Promise<unknown> => ({})),
    writeContract: vi.fn(async (): Promise<unknown> => ({ id: 'ab'.repeat(32), status: 'executed' })),
  }
  const onPendingConfirmation = vi.fn()
  let submit!: ReturnType<typeof useDuskDomainWriter>
  function Probe() {
    submit = useDuskDomainWriter({ wallet: session, chainId: 'dusk:0', nodeUrl, liveDuskDomainsApp: app, contracts,
      getWorkspaceToken: name => name === visit.name ? visit : null, onPendingConfirmation,
      writeAccess: createWriteAccess({ mode: 'live_ready', liveWritesEnabled: true }, app, unpaused) })
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  const props = {
    canPrepareCommit: true, displayName: 'alpha.dusk', nodeHex: namehashHex('alpha.dusk'), duration: 1,
    selectedAddress: 'owner', selectedAuthority: `0x${'11'.repeat(32)}`, runtimeConfig: { chainId: 'dusk:0', contracts },
    liveDuskDomainsApp: null, indexerClient: null, loadPendingReservations: () => listPendingNameReservations(),
    ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: vi.fn(async () => true),
    getCurrentBlockHeight: async () => 500, setCommitTxState: vi.fn(), setWalletError: vi.fn(),
    setRegistrationCompletion: vi.fn(), setPreparedCommit: vi.fn(), setCurrentBlockHeight: vi.fn(),
    setNowSeconds: vi.fn(), setCommitted: vi.fn(), setRegistrationStep: vi.fn(), setTxState: vi.fn(),
    setIndexerError: vi.fn(), setIndexerConfirmation: vi.fn(), submitNameWrite: submit,
  }
  return { app, props, submit, onPendingConfirmation, visit: (name: string) => { visit = { name } } }
}

it.each(['beta.dusk', 'alpha.dusk'])('cancels a reservation when preparation outlives the visit to %s', async destination => {
  const h = fixture()
  const prepared = Promise.withResolvers<unknown>()
  h.app.prepareContractCall.mockReturnValueOnce(prepared.promise)
  const pending = prepareRegistrationCommit(h.props as never)
  await vi.waitFor(() => expect(h.app.prepareContractCall).toHaveBeenCalledOnce())
  h.visit('beta.dusk')
  if (destination === 'alpha.dusk') h.visit('alpha.dusk')
  h.props.setCommitTxState.mockClear()
  prepared.resolve({})
  await pending
  expect(h.app.writeContract).not.toHaveBeenCalled()
  expect(listPendingNameReservations()).toEqual([])
  expect(h.props.setCommitTxState).not.toHaveBeenCalled()
  expect(h.props.setPreparedCommit).not.toHaveBeenCalled()
})

it('saves the secret before the wallet request and retains it after navigation through confirmation', async () => {
  const h = fixture()
  const approval = Promise.withResolvers<unknown>()
  let savedSecret: string | undefined
  h.app.writeContract.mockImplementationOnce(() => {
    savedSecret = listPendingNameReservations()[0]?.secret
    return approval.promise
  })
  const pending = prepareRegistrationCommit(h.props as never)
  await vi.waitFor(() => expect(h.app.writeContract).toHaveBeenCalledOnce())
  expect(savedSecret).toBeTruthy()
  h.visit('beta.dusk')
  h.props.setCommitTxState.mockClear()
  const confirmed = Promise.withResolvers<unknown>()
  approval.resolve({ id: 'broadcast-tx', wait: () => confirmed.promise })
  await vi.waitFor(() => expect(h.onPendingConfirmation).toHaveBeenCalledWith(expect.objectContaining({ name: 'alpha.dusk' })))
  confirmed.resolve({ status: 'executed' })
  await pending
  expect(listPendingNameReservations()[0]).toMatchObject({ secret: savedSecret, committedTxId: 'broadcast-tx' })
  expect(h.props.setCommitTxState).not.toHaveBeenCalled()
  expect(h.props.setPreparedCommit).not.toHaveBeenCalled()
  expect(h.onPendingConfirmation).toHaveBeenLastCalledWith(null)
})

it.each(['reject', 'session', 'transport', 'preparation', 'storage', 'existing'])('handles %s without losing an uncertain reservation', async outcome => {
  const h = fixture()
  if (outcome === 'session') h.app.writeContract.mockRejectedValueOnce(new WalletSessionChangedError())
  if (outcome === 'reject') h.app.writeContract.mockRejectedValueOnce(new DuskWalletUserRejectedError())
  if (outcome === 'transport') h.app.writeContract.mockRejectedValueOnce(new Error('Transport cancelled after broadcast'))
  if (outcome === 'preparation') h.app.prepareContractCall.mockRejectedValueOnce(new Error('Cannot prepare call'))
  if (outcome === 'storage') vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('Storage full') } })
  if (outcome === 'existing') {
    h.app.writeContract.mockRejectedValueOnce(new Error('Transport interrupted'))
    await prepareRegistrationCommit(h.props as never)
    h.app.writeContract.mockClear()
  }
  const previous = listPendingNameReservations()[0]
  await prepareRegistrationCommit(h.props as never)
  if (outcome === 'existing') expect(listPendingNameReservations()).toEqual([previous])
  else expect(listPendingNameReservations()).toHaveLength(outcome === 'transport' ? 1 : 0)
  if (['preparation', 'storage', 'existing'].includes(outcome)) expect(h.app.writeContract).not.toHaveBeenCalled()
})

it('removes write-ahead data if saving fails before the request, independently of the visit', async () => {
  const h = fixture()
  const cleanup = vi.fn()
  const beforeSign = () => { h.visit('beta.dusk'); throw new Error('Storage unavailable') }
  await h.submit('alpha.dusk', storeCommitRequest({ commitment: `0x${'22'.repeat(32)}` }), {
    workspace: h.submit.captureWorkspace('alpha.dusk'), beforeSign, onNotBroadcast: cleanup,
  })
  expect(h.app.writeContract).not.toHaveBeenCalled()
  expect(cleanup).toHaveBeenCalledOnce()
})

it.each([true, false])('does not adopt a return visit after balance preflight (balance succeeds: %s)', async balanceOk => {
  const h = fixture()
  const balance = Promise.withResolvers<boolean>()
  let draft: string
  const error = vi.fn()
  const refresh = vi.fn(async () => false)
  const pending = saveDomainRecords({ activeRecordTarget: { name: 'alpha.dusk', node: namehashHex('alpha.dusk') }, canSaveRecords: true,
    recordDraftMutations: [{ action: 'set', key: 'website', value: 'https://old.test' }], runtimeConfig: h.props.runtimeConfig,
    ensureContractAuthorityForLiveWrite: () => true,
    ensurePublicBalanceForLiveWrite: async (_action: string, setError: (message: string) => void) => {
      const ok = await balance.promise
      if (!ok) setError('Not enough balance')
      return ok
    },
    submitNameWrite: h.submit, setRecordError: error, setRecordTxState: vi.fn(),
    setRecordDrafts: () => { draft = '' }, shouldApplyPreviewWriteFallback: refresh,
  } as never)
  h.visit('beta.dusk')
  h.visit('alpha.dusk')
  draft = 'new unsaved draft'
  error.mockClear()
  balance.resolve(balanceOk)
  await pending
  expect(h.app.writeContract).not.toHaveBeenCalled()
  expect(h.app.prepareContractCall).not.toHaveBeenCalled()
  expect(refresh).not.toHaveBeenCalled()
  expect(error).not.toHaveBeenCalled()
  expect(draft).toBe('new unsaved draft')
})

it.each(['lock', 'disconnect', 'authorization', 'network', 'account', 'profile', 'unknown chain', 'local node', 'generation', 'provider'])('sends nothing after %s during preparation without navigating', async change => {
  const session = { state: { ...wallet.state, explicitlyDisconnected: false, generation: 1 } }
  const h = fixture(session, 'http://127.0.0.1:18181/')
  const prepared = Promise.withResolvers<unknown>()
  h.app.prepareContractCall.mockReturnValueOnce(prepared.promise)
  const pending = prepareRegistrationCommit(h.props as never)
  await vi.waitFor(() => expect(h.app.prepareContractCall).toHaveBeenCalledOnce())
  if (change === 'generation') session.state.generation++
  if (change === 'provider') session.state.providerId = 'replacement'
  if (change === 'lock') session.state = { ...session.state, profiles: [], selectedProfile: null }
  // Revocation can fail, leaving the base wallet authorized.
  if (change === 'disconnect') session.state.explicitlyDisconnected = true
  if (change === 'authorization') session.state.authorized = false
  if (change === 'local node') session.state.node = { nodeUrl: 'http://localhost:18181/' } as never
  if (change === 'network') session.state.chainId = 'dusk:1'
  if (change === 'unknown chain') session.state.chainId = null
  if (change === 'account') session.state.selectedProfile = { account: 'other', profileId: 'primary' }
  if (change === 'profile') session.state.selectedProfile = { account: 'owner', profileId: 'other' }
  prepared.resolve({})
  await pending
  expect(h.app.writeContract).not.toHaveBeenCalled()
  expect(listPendingNameReservations()).toEqual([])
  const message = ['network', 'unknown chain'].includes(change) ? 'wallet session changed' : 'wallet session changed'
  expect(h.props.setCommitTxState).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', message: expect.stringContaining(message) }))
})

it('keeps the initiating session through balance recovery and submission', async () => {
  const session = { state: { ...wallet.state, generation: 1 } }
  const h = fixture(session)
  h.props.ensurePublicBalanceForLiveWrite.mockImplementationOnce(async () => {
    session.state.selectedProfile = { account: 'other-owner', profileId: 'secondary' }
    return true
  })
  await prepareRegistrationCommit(h.props as never)
  expect(h.app.prepareContractCall).not.toHaveBeenCalled()
  expect(h.app.writeContract).not.toHaveBeenCalled()
  expect(listPendingNameReservations()).toEqual([])
})
