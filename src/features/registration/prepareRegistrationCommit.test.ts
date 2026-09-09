import { afterEach, expect, it, vi } from 'vitest'
import { listPendingNameReservations, namehashHex, type DuskDomainTxState } from '../../names/internal'
import { prepareRegistrationCommit } from './prepareRegistrationCommit'
import { forgetPendingReservation } from '../search/actions/forgetPendingReservation'

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
afterEach(() => vi.unstubAllGlobals())

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
