import { renderToStaticMarkup } from 'react-dom/server'
import { encodeBase58 } from '@duskdomains/sdk'
import { expect, it, vi } from 'vitest'
import { contractPrincipalFromWalletAccount, type ResolverRecord, type ResolverRecordKey } from '../../names/internal'
import { account } from '../../test/frozenFixtures'
import { NameHeader } from '../search/NameHeader'
import { ownerAddressCandidates } from './ownerLabel'
import { trustedDuskAddresses } from './addressTrust'

const record = (key: string, value: string, extra: Partial<ResolverRecord> = {}): ResolverRecord => ({
  key: key as ResolverRecordKey, value, visibility: 'public', ttlSeconds: 300, updatedAt: '', ...extra,
})
const owner = (contractPrincipalFromWalletAccount(account) as { principal: string }).principal
// A record the indexer's /resolve reports as invalid_record, though its value parses.
const flagged = record('moonlight_address', account, { resolverIssue: 'moonlight_address: Moonlight addresses must use a dusk1-prefixed address or Dusk account address form.' })
const malformed = record('moonlight_address', encodeBase58(new TextEncoder().encode('not-a-real-address')))

const header = (records: ResolverRecord[], ownerAddresses: string[] = []) => renderToStaticMarkup(<NameHeader displayName="noahedge.dusk" lifecycleLabel={null}
  primaryVerified={false} records={records} reserved={false} status="registered" owner={owner} ownerAddresses={ownerAddresses} />)

it('shows and copies the owner’s Dusk address in the header only from a record “Send to” would offer', () => {
  for (const html of [header([flagged]), header([malformed])]) {
    expect(html).not.toContain('aria-label="Copy Dusk address"')
    expect(html).not.toContain(`title="${account}"`)
    expect(html).toContain('Account ID')
  }
  const ok = header([record('moonlight_address', account)])
  expect(ok).toContain('aria-label="Copy Dusk address"')
  expect(ok).toContain(`title="${account}"`)
})

it('takes owner address candidates only from valid, unflagged records', () => {
  expect(ownerAddressCandidates([flagged, malformed])).toEqual([])
  expect(ownerAddressCandidates([record('moonlight_address', account)])).toEqual([account])
  expect(trustedDuskAddresses([flagged, malformed, record('website', 'https://example.test'), record('moonlight_address', account)])).toEqual([account])
})

// Every other consumer of a name's Dusk address record follows the same rule.
it('reads no ancestor address from a record the indexer flags', async () => {
  const { readIndexedName } = await import('../search/indexedNameReads')
  const { namehashHex } = await import('../../names/internal')
  const node = namehashHex('maya.nightowlshq.dusk')
  const parent = { node: namehashHex('nightowlshq.dusk'), name: 'nightowlshq.dusk', owner, manager: owner, expiresAtBlockHeight: 200 }
  const client = {
    resolveForward: vi.fn(async () => ({ records: [] })),
    getNameState: vi.fn(async () => ({ node, owner, manager: owner, expiresAtBlockHeight: 100, graceEndsAtBlockHeight: 100, namespace: { ancestors: [parent] } })),
    getActivityPage: vi.fn(async () => ({ activity: [] })), getAllSubnames: vi.fn(async () => []), getSubname: vi.fn(async () => null),
    getPrimaryName: vi.fn(async () => null),
    getNodeRecord: vi.fn(async () => flagged),
  }
  const reads = await readIndexedName(client as never, { canonical: 'maya.nightowlshq.dusk' } as never, '')
  expect(reads?.ancestorAddresses).toEqual([])
})

it('never reads, counts or shows a flagged address as a name’s primary', async () => {
  const { readIndexedPrimarySummary, indexedPrimaryIsActive } = await import('../domains/indexedPrimary')
  const { MyDomainsView } = await import('../domains/MyDomainsView')
  const { namehashHex } = await import('../../names/internal')
  const name = { node: namehashHex('noahedge.dusk'), canonicalName: 'noahedge.dusk', owner, manager: owner, status: 'active', records: [flagged],
    expiresAtBlockHeight: 5_000, subnameCount: 0, activityCount: 0 } as never
  // The reverse mapping alone can't make a flagged address the name's primary.
  const getPrimaryName = vi.fn(async () => 'noahedge.dusk')
  expect(indexedPrimaryIsActive(name, 100)).toBe(false)
  expect(await readIndexedPrimarySummary({ getPrimaryName }, name)).toEqual({ label: 'Invalid address', tone: 'warning' })
  expect(getPrimaryName).not.toHaveBeenCalled()
  const props = { currentBlockHeight: 100, myNames: [name], primarySummaries: { [namehashHex('noahedge.dusk')]: { label: 'Verified', tone: 'success' } },
    pendingReservations: [], wallet: { selectedAddress: account } } as unknown as Parameters<typeof MyDomainsView>[0]
  const html = renderToStaticMarkup(<MyDomainsView {...props} />)
  expect(html).not.toContain('1 primary')
  expect(html).not.toContain('>Primary name</span>')
})

it('counts a name as the wallet’s through its address record only when the record can be trusted', async () => {
  const { fetchWalletScopedNames } = await import('../domains/myDomainsData')
  const stranger = `0x${'44'.repeat(32)}`
  const pointed = (records: ResolverRecord[]) => ({ node: 'n', canonicalName: 'pointed.dusk', owner: stranger, manager: stranger, records })
  const getAllNames = vi.fn(async () => [pointed([flagged]), { ...pointed([record('moonlight_address', account)]), node: 'm', canonicalName: 'valid.dusk' }])
  const names = await fetchWalletScopedNames({ indexerClient: { getAllNames } as never, selectedAddress: account, selectedAuthority: owner })
  expect(names.map(name => name.canonicalName)).toEqual(['valid.dusk'])
})
