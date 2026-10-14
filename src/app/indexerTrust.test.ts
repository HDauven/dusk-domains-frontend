import { afterEach, expect, it, vi } from 'vitest'
import { roles } from '../names/config'
import { namehashHex } from '../names/hash'
import { config } from '../test/frozenFixtures'
import { createHealthyIndexerClient } from './indexerReadHelpers'
import { indexerFreshness, type IndexerHealth } from './networkFreshness'

afterEach(() => vi.unstubAllGlobals())

const prefixed = (id: string) => `0x${id.replace(/^0x/, '')}`
// /health's deployment block: each role's configured contract and every one admitted for it since.
function deployment(change: (contracts: Record<string, { contractId: string, contractIds: string[] }>) => void = () => {}, chainId = 'dusk:0') {
  const contracts = Object.fromEntries(roles.map(role => {
    const id = prefixed(config.contracts[role]!.contractId)
    return [role, { contractKey: role, contractId: id, contractIds: [id], contractIdConflict: false }]
  }))
  change(contracts)
  return { chainId, chainIds: [chainId], deploymentStartHeight: 1, complete: true, missingContracts: [], conflictedContracts: [], contracts }
}
const health = (extra: Record<string, unknown> = {}) => ({
  ok: true, pause: { registrationsPaused: true, tradingPaused: false }, generatedAt: '2026-10-13T10:00:00.000Z', source: 'sqlite', mode: 'sqlite',
  currentBlockHeight: 100, lagBlocks: 1, routes: ['/health', '/name'], names: 3, deployment: deployment(), ...extra,
})
const node = namehashHex('aurora.dusk')

function indexer(body: Record<string, unknown>) {
  const fetcher = vi.fn(async (input: string | URL | Request) => {
    const path = new URL(String(input)).pathname
    if (path.endsWith('/health')) return Response.json(body)
    return Response.json({ canonicalName: 'aurora.dusk', node, owner: null, manager: null, resolverId: null, expiresAt: null, graceEndsAt: null, status: 'active', lastEventType: '' })
  })
  vi.stubGlobal('fetch', fetcher)
  return { fetcher, client: createHealthyIndexerClient('http://indexer.test/api', config) }
}
const nameReads = (fetcher: ReturnType<typeof indexer>['fetcher']) => fetcher.mock.calls.filter(([input]) => !String(input).includes('/health'))

it.each([
  ['another network', deployment(() => {}, 'dusk:1')],
  ['another directory', deployment(contracts => { contracts.directory = { contractId: prefixed('ee'.repeat(32)), contractIds: [prefixed('ee'.repeat(32))] } })],
  ['a store this site’s deployment never had', deployment(contracts => { contracts.store = { contractId: prefixed('ee'.repeat(32)), contractIds: [prefixed('ee'.repeat(32))] } })],
  ['no deployment identity at all', undefined],
])('treats a healthy indexer for %s as unhealthy, and reads no names from it', async (_, identity) => {
  const { client, fetcher } = indexer(health({ deployment: identity }))
  const reported = await client.getHealth()
  expect(reported.ok).toBe(false)
  // Its pause and other projection data aren't this site's either.
  await expect(client.getNameState(node)).rejects.toThrow('Name data for this network can’t be verified right now.')
  expect(nameReads(fetcher)).toHaveLength(0)
  expect(indexerFreshness(reported, Date.now())).toBe('Name data for this network can’t be verified right now.')
})

it('trusts the indexer of this deployment, including the contracts admitted since launch', async () => {
  const later = prefixed('0c'.repeat(32))
  const { client, fetcher } = indexer(health({ deployment: deployment(contracts => {
    // After a SetPolicy or an AddStore the indexer keeps the launch contract first and lists the new one beside it.
    contracts.policy.contractIds.push(later)
    contracts.store.contractIds.push(later)
  }) }))
  expect((await client.getHealth()).ok).toBe(true)
  await expect(client.getNameState(node)).resolves.toMatchObject({ canonicalName: 'aurora.dusk' })
  expect(nameReads(fetcher)).toHaveLength(1)
})

// The indexer marks its own deployment record incomplete or conflicted. Each of these, and a record
// that leaves the fields out, is another deployment's data as far as this site can tell.
const without = <T extends object>(value: T, key: keyof T) => Object.fromEntries(Object.entries(value).filter(([name]) => name !== key))
it.each([
  ['says it is incomplete', (d: ReturnType<typeof deployment>) => ({ ...d, complete: false })],
  ['doesn’t say it is complete', (d: ReturnType<typeof deployment>) => without(d, 'complete')],
  ['misses a contract', (d: ReturnType<typeof deployment>) => ({ ...d, missingContracts: ['marketplace'] })],
  ['doesn’t list missing contracts', (d: ReturnType<typeof deployment>) => without(d, 'missingContracts')],
  ['has a conflicted contract', (d: ReturnType<typeof deployment>) => ({ ...d, conflictedContracts: ['vault'] })],
  ['doesn’t list conflicted contracts', (d: ReturnType<typeof deployment>) => without(d, 'conflictedContracts')],
  ['flags a role’s contract ID conflict', (d: ReturnType<typeof deployment>) => ({ ...d, contracts: { ...d.contracts, vault: { ...d.contracts.vault, contractIdConflict: true } } })],
  ['doesn’t say whether a role conflicts', (d: ReturnType<typeof deployment>) => ({ ...d, contracts: { ...d.contracts, vault: without(d.contracts.vault, 'contractIdConflict') } })],
  ['reports another primary contract with this site’s beside it', (d: ReturnType<typeof deployment>) => ({ ...d, contracts: Object.fromEntries(Object.entries(d.contracts)
    .map(([role, row]) => [role, { ...row, contractId: prefixed('ee'.repeat(32)), contractIds: [prefixed('ee'.repeat(32)), row.contractId] }])) })],
])('treats an indexer whose deployment record %s as unhealthy', async (_, change) => {
  const { client, fetcher } = indexer(health({ deployment: change(deployment()) }))
  const reported = await client.getHealth()
  expect(reported.ok).toBe(false)
  await expect(client.getNameState(node)).rejects.toThrow('Name data for this network can’t be verified right now.')
  expect(nameReads(fetcher)).toHaveLength(0)
})

it.each(['blocked', 'stopped'])('says name data stopped updating while the indexer’s collector is %s, instead of presenting it as live', status => {
  const now = Date.parse('2026-10-13T10:00:10.000Z')
  const live = health({ cursor: { status: 'running', updatedAt: '2026-10-13T10:00:00.000Z' } }) as unknown as IndexerHealth
  expect(indexerFreshness(live, now)).toBeNull()
  const stuck = health({ cursor: { status, updatedAt: '2026-10-13T10:00:00.000Z' } }) as unknown as IndexerHealth
  expect(indexerFreshness(stuck, now)).toBe('Name data stopped updating. Recent changes may not appear until it resumes.')
})
