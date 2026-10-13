import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { searchActions } from '../features/search/test-fixtures/searchActions'
import { useIndexedNameHydration } from '../features/search/useIndexedNameHydration'
import { roles } from '../names/config'
import { namehashHex } from '../names/hash'
import { submitDuskDomainWrite, type DuskDomainTxState, type NameResult } from '../names/internal'
import { config } from '../test/frozenFixtures'
import type { ConfirmationState } from './confirmationRead'
import { createHealthyIndexerClient, waitForIndexerBlock } from './indexerReadHelpers'
import { staleIndexerData } from './indexerIdentity'
import { indexerFreshness, type IndexerHealth } from './networkFreshness'
import { unpaused } from './operatorPause'
import { useDuskDomainWriter } from './useDuskDomainWriter'
import { createWriteAccess } from './writeAccess'

vi.mock('../names/internal', async importOriginal => ({
  ...await importOriginal<typeof import('../names/internal')>(), submitDuskDomainWrite: vi.fn(),
}))
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks() })

const prefixed = (id: string) => `0x${id.replace(/^0x/, '')}`
const deployment = (chainId = 'dusk:0') => ({
  chainId, chainIds: [chainId], deploymentStartHeight: 1, complete: true, missingContracts: [], conflictedContracts: [],
  contracts: Object.fromEntries(roles.map(role => [role, { contractKey: role, contractId: prefixed(config.contracts[role]!.contractId),
    contractIds: [prefixed(config.contracts[role]!.contractId)], contractIdConflict: false }])),
})
const healthy = (extra: Record<string, unknown> = {}) => ({
  ok: true, pause: { registrationsPaused: false, tradingPaused: false }, generatedAt: '2026-10-13T10:00:00.000Z', source: 'sqlite', mode: 'sqlite',
  currentBlockHeight: 50, finalizedBlockHeight: 50, projectionBlockHeight: 50, lagBlocks: 0, routes: ['/health', '/name'], names: 3,
  deployment: deployment(), warnings: [], cursor: { status: 'running', updatedAt: '2026-10-13T10:00:00.000Z' }, ...extra,
})
// /health while the archive collector can't accept block 42: the publication stays at block 41.
const blocked = (extra: Record<string, unknown> = {}) => healthy({
  ok: false, finalizedBlockHeight: 41, projectionBlockHeight: 41, lagBlocks: 9,
  collector: { status: 'blocked', blocked: true, stuckAtBlockHeight: 42, scannedBlockHeight: 41,
    reason: { code: 'unsupported_event', role: 'resolver', emitter: null, topic: 'future_topic', txId: null }, since: '2026-10-13T09:00:00.000Z', attempts: 17 },
  degradedReason: { code: 'collector_blocked', message: 'Indexer health is degraded; consult server logs.' },
  cursor: { status: 'blocked', reason: 'Collector is not ready; consult server logs.', updatedAt: '2026-10-13T09:00:00.000Z' },
  ...extra,
})
const catchingUp = () => healthy({ ok: false, degradedReason: { code: 'archive_not_caught_up', message: 'Indexer health is degraded; consult server logs.' } })
const node = namehashHex('aurora.dusk')

function indexer(body: () => Record<string, unknown>) {
  const fetcher = vi.fn(async (input: string | URL | Request) => {
    const path = new URL(String(input)).pathname
    if (path.endsWith('/health')) return Response.json(body())
    return Response.json({ canonicalName: 'aurora.dusk', node, owner: null, manager: null, resolverId: null, expiresAt: null, graceEndsAt: null, status: 'active', lastEventType: '' })
  })
  vi.stubGlobal('fetch', fetcher)
  const nameReads = () => fetcher.mock.calls.filter(([input]) => !String(input).includes('/health'))
  return { fetcher, nameReads, client: createHealthyIndexerClient('http://indexer.test/api', config) }
}

it('keeps serving the last complete publication while the collector is blocked, and says where it stopped', async () => {
  const { client, nameReads } = indexer(() => blocked())
  const health = await client.getHealth()
  expect(health.ok).toBe(false)
  expect(staleIndexerData(health)).toEqual({ code: 'collector_blocked', blockHeight: 41 })
  await expect(client.getNameState(node)).resolves.toMatchObject({ canonicalName: 'aurora.dusk' })
  expect(nameReads()).toHaveLength(1)
  expect(indexerFreshness(health, Date.now())).toBe('Name data stopped updating at block 41. Recent changes may not appear until it resumes.')
})

it('keeps serving while the collector catches up, marked as catching up', async () => {
  const { client } = indexer(catchingUp)
  const health = await client.getHealth()
  expect(staleIndexerData(health)).toEqual({ code: 'archive_not_caught_up', blockHeight: 50 })
  await expect(client.getNameState(node)).resolves.toMatchObject({ canonicalName: 'aurora.dusk' })
  expect(indexerFreshness(health, Date.now())).toBe('Name data is catching up. Recent changes may take longer to appear.')
})

it.each([
  ['for another deployment', () => blocked({ deployment: deployment('dusk:1') }), 'Name data for this network can’t be verified right now.'],
  ['with unverified history', () => blocked({ degradedReason: { code: 'history_unverified', message: '' } }), 'still syncing'],
  ['after a rejected publication', () => blocked({ degradedReason: { code: 'publication_candidate_rejected', message: '' } }), 'still syncing'],
  ['for an unnamed degradation', () => blocked({ degradedReason: { code: 'indexer_health_degraded', message: '' } }), 'still syncing'],
  ['with a replay warning beside the blocked collector', () => blocked({ warnings: [{ code: 'invalid_receipt', message: 'Indexer warning; consult server logs.' }] }), 'still syncing'],
  ['with no complete publication', () => blocked({ projectionBlockHeight: null }), 'still syncing'],
  ['without saying why', () => blocked({ degradedReason: undefined }), 'still syncing'],
])('reads nothing from an unhealthy indexer %s', async (_, body, message) => {
  const { client, nameReads } = indexer(body)
  const health = await client.getHealth()
  expect(staleIndexerData(health)).toBeNull()
  await expect(client.getNameState(node)).rejects.toThrow(message)
  expect(nameReads()).toHaveLength(0)
})

it('shows a name page from the last publication while the collector is blocked', async () => {
  const result = { canonical: 'alpha.dusk', status: 'available' } as NameResult
  const client = { getHealth: vi.fn(async () => blocked()), searchName: vi.fn(async () => result), resolveForward: vi.fn(async () => ({ records: [] })),
    getNameState: vi.fn(async () => null), getActivityPage: vi.fn(async () => ({ activity: [] })), getAllSubnames: vi.fn(async () => []) }
  let loader!: ReturnType<typeof useIndexedNameHydration>
  function Probe() {
    loader = useIndexedNameHydration({ ...searchActions(), indexerClient: client, displayName: 'alpha.dusk' } as never)
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  await loader.hydrateNameFromIndexer(client as never, result)
  expect(client.resolveForward).toHaveBeenCalledOnce()
})

it('pauses a write’s confirmation at once while the collector is blocked, and confirms once it resumes', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('window', { dispatchEvent: vi.fn() })
  const txId = 'ab'.repeat(32)
  const receipts = vi.fn(async () => ({ ok: true, json: async () => ({ data: { tx: { id: txId, blockHeight: 45, err: null } } }) }))
  vi.stubGlobal('fetch', receipts)
  let health: Record<string, unknown> = blocked()
  const getHealth = vi.fn(async () => health)
  const updates: ConfirmationState[] = []
  const timeout = { status: 'timeout', txId, context: { title: 'Update records' } } as DuskDomainTxState
  vi.mocked(submitDuskDomainWrite).mockImplementation(async (_app, _call, options) => { options?.onUpdate?.(timeout); return timeout })
  let submit!: ReturnType<typeof useDuskDomainWriter>
  function Probe() {
    submit = useDuskDomainWriter({ wallet: { state: { installed: true, authorized: true, chainId: 'dusk:0', profiles: [], selectedProfile: { account: 'owner', profileId: 'primary' } } } as never,
      chainId: 'dusk:0', writeAccess: createWriteAccess({ mode: 'live_ready', liveWritesEnabled: true }, {} as never, unpaused), liveDuskDomainsApp: {} as never,
      contracts: {} as never, nodeUrl: 'http://127.0.0.1:18181/', indexerClient: { getHealth } as never })
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  let finished = false
  const pending = submit('alpha.dusk', {} as never, { onUpdate: state => updates.push(state) }).then(state => { finished = true; return state })
  await vi.advanceTimersByTimeAsync(0)
  expect(finished).toBe(false)
  expect(updates.at(-1)).toMatchObject({ status: 'executing', txId, retryConfirmation: expect.any(Function),
    pauseReason: 'Confirmed on chain. Name data stopped updating at block 41, so this page will show the change once it resumes.' })
  // Paused: nothing is polled while the indexer can't reach the transaction's block.
  const reads = getHealth.mock.calls.length
  await vi.advanceTimersByTimeAsync(120_000)
  expect(getHealth).toHaveBeenCalledTimes(reads)
  health = healthy({ finalizedBlockHeight: 45, projectionBlockHeight: 45 })
  updates.at(-1)!.retryConfirmation!()
  await vi.advanceTimersByTimeAsync(0)
  expect(await pending).toMatchObject({ status: 'executed', txId, blockHeight: 45 })
})

it('stops waiting for a market write’s block at once while the collector is blocked', async () => {
  const getHealth = vi.fn(async () => blocked())
  expect(await waitForIndexerBlock({ getHealth } as never, 45)).toBe(false)
  expect(getHealth).toHaveBeenCalledOnce()
})

it('says plainly when the indexer’s data stopped without a known block', () => {
  const stopped = healthy({ ok: false, cursor: { status: 'stopped', updatedAt: '2026-10-13T10:00:00.000Z' } }) as unknown as IndexerHealth
  expect(indexerFreshness(stopped, Date.now())).toBe('Name data stopped updating. Recent changes may not appear until it resumes.')
})
