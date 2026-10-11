import { authority, hex } from '@duskdomains/sdk'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { account } from '../../test/frozenFixtures'
import { endpointBytes } from '../../names/reads'
import { namehashHex, type DuskDomainsIndexerClient, type IndexedNameSummary } from '../../names/internal'
import { deriveAppDerivedState } from '../../app/derived/deriveAppDerivedState'
import { PrimaryNameControl } from '../domains/PrimaryNameControl'
import { MyDomainsView, type MyDomainsViewProps } from '../domains/MyDomainsView'
import { readIndexedPrimarySummary, readIndexedPrimarySummaries } from '../domains/indexedPrimary'
import { SearchResultPanel, type SearchResultPanelProps } from './SearchResultPanel'
import { readIndexedName } from './indexedNameReads'

const name = 'amberquill.dusk', node = namehashHex(name)
const owner = '0x' + hex(authority({ kind: 'Moonlight', bytes: endpointBytes(account) }))
const other = '0x' + '66'.repeat(32)
const record = { key: 'moonlight_address', value: account, visibility: 'public', ttlSeconds: 60, updatedAt: '' } as const
const cases = [
  { change: 'listed in escrow', owner: other, manager: other, inMarketplaceEscrow: true, height: 100, resolves: false, notice: 'paused while this name is listed for sale' },
  { change: 'transferred with identity kept', owner: other, manager: other, height: 100, resolves: false, notice: 'no longer resolves as your primary; clear it or choose another' },
  { change: 'manager-only', owner: other, manager: owner, height: 100, resolves: true },
  { change: 'expiry boundary', owner, manager: owner, height: 200, resolves: false, notice: 'because it has expired' },
  { change: 're-registration with an old mapping', owner, manager: owner, height: 100, resolves: false, notice: 'no longer resolves as your primary' },
  { change: 'cancel-listing restores the primary', owner, manager: owner, height: 100, resolves: true },
]

it.each(cases)('keeps profile, header, toggle, settings and My names consistent after $change', async scenario => {
  const managedName = { node, owner: scenario.owner, manager: scenario.manager, expiresAt: 200, graceEndsAt: 300, expiryPolicy: null,
    resolver: 'resolver', inMarketplaceEscrow: scenario.inMarketplaceEscrow ?? false }
  const client = {
    resolveForward: vi.fn(async () => ({ records: [record], verificationStatus: 'forward_resolved', expiry: { status: 'active' }, resolver: { health: 'ok' } })),
    getNameState: vi.fn(async () => ({ ...managedName, expiresAtBlockHeight: 200 })),
    getPrimaryName: vi.fn(async () => scenario.resolves ? name : null),
    getActivityPage: vi.fn(async () => ({ activity: [] })), getAllSubnames: vi.fn(async () => []),
  } as unknown as DuskDomainsIndexerClient
  const chain = { getPrimaryName: vi.fn(async () => ({ ok: true, value: scenario.resolves ? name : null })),
    readPrimaryName: vi.fn(async () => ({ ok: true, value: { name } })) }
  const reads = await readIndexedName(client, { canonical: name } as never, account, chain as never)
  expect(reads?.primaryName).toBe(scenario.resolves ? name : null)
  expect(reads?.connectedPrimaryName).toBe(name)
  const input = { displayName: name, nodeHex: node, managedName, currentBlockHeight: scenario.height, nowSeconds: 0,
    moonlightRecord: record, primaryName: reads?.primaryName, connectedPrimaryName: reads?.connectedPrimaryName,
    primaryEndpointValue: account, selectedAddress: account, selectedAuthority: owner, walletSigningReady: true,
    pendingReservations: [], subnames: [], subnameLabel: '', subnameManager: '', confirmationInput: '', recordDraftErrors: [], recordDraftMutations: [] }
  const state = deriveAppDerivedState(input as never)
  expect(state.primaryVerification.verified).toBe(scenario.resolves)
  expect(state.canClearPrimary).toBe(true)
  if (scenario.notice) expect(state.primaryVerification.cleanupDescription).toContain(scenario.notice)
  // A previously verified read cannot survive a local authority/height refresh.
  if (['listed in escrow', 'transferred with identity kept', 'expiry boundary'].includes(scenario.change)) {
    expect(deriveAppDerivedState({ ...input, primaryName: name } as never).primaryVerification.verified).toBe(false)
  }
  const primaryProps = { ...state, displayName: name, error: '', txState: null, onSetPrimary: vi.fn(), onClearPrimary: vi.fn() }
  const control = renderToStaticMarkup(<PrimaryNameControl {...primaryProps} />)
  expect(control).toContain(`aria-checked="${scenario.resolves}"`)
  expect(control.includes(`Apps show ${name}`)).toBe(scenario.resolves)
  if (!scenario.resolves) expect(control).toContain('>Clear primary name</button>')

  for (const resultView of ['details', 'manage']) {
    const html = renderToStaticMarkup(<SearchResultPanel {...{
      nodeHex: node, resultView,
      headerProps: { displayName: name, status: 'registered', records: [record], viewerAuthority: owner, primaryVerified: state.primaryVerification.verified },
      detailsProps: { displayName: name, parentResolverRecords: [record], subnames: [], primaryVerification: state.primaryVerification, activity: { activityEntries: [] } },
      management: { primaryProps,
        settingsProps: { displayName: name, managedName, ownership: {}, clock: { currentBlockHeight: scenario.height, nowSeconds: 0 },
          renewal: { minDurationYears: 1, maxDurationYears: 5, renewalYears: 1, renewalFee: 1, renewalPreviewExpiresAt: 300 } },
        subdomainsProps: { subnames: [], authority: {}, clock: {} } },
    } as unknown as SearchResultPanelProps} />)
    expect(html.includes('>Primary name</span>')).toBe(scenario.resolves)
    expect(html.includes(`Apps show ${name}`)).toBe(scenario.resolves)
    if (scenario.notice) expect(html).toContain(scenario.notice)
    // The share card is name artwork and makes no claim about a wallet's primary.
    expect(html).toContain(`Share card for ${name}`)
  }
  const indexed = { ...managedName, canonicalName: name, status: 'active', records: [record], expiresAt: null, expiresAtBlockHeight: 200,
    primaryName: name, primaryStatus: 'verified', subnameCount: 0, activityCount: 0 } as unknown as IndexedNameSummary
  const summary = await readIndexedPrimarySummary(client, indexed)
  const list = renderToStaticMarkup(<MyDomainsView {...{
    currentBlockHeight: scenario.height, myNames: [indexed], primarySummaries: { [node]: summary }, pendingReservations: [],
    wallet: { selectedAddress: account },
  } as unknown as MyDomainsViewProps} />)
  expect(list.includes('>Primary name</span>')).toBe(scenario.resolves)
  expect(list.includes('1 primary')).toBe(scenario.resolves)
  if (scenario.change === 're-registration with an old mapping') expect(client.getPrimaryName).toHaveBeenCalled()
})

it('keeps expiry from displaying a cached My names primary between list refreshes', () => {
  const indexed = { node, canonicalName: name, owner, manager: owner, status: 'active', records: [record], expiresAtBlockHeight: 200 } as IndexedNameSummary
  const html = renderToStaticMarkup(<MyDomainsView {...{
    currentBlockHeight: 200, myNames: [indexed], primarySummaries: { [node]: { tone: 'success' } }, pendingReservations: [], wallet: { selectedAddress: account },
  } as unknown as MyDomainsViewProps} />)
  expect(html).not.toContain('>Primary name</span>')
  expect(html).not.toContain('1 primary')
})

it('shares an address lookup within a list refresh and resolves again after cancellation', async () => {
  const names = [name, 'another.dusk'].map(canonicalName => ({
    canonicalName, node: namehashHex(canonicalName), owner, manager: owner, status: 'active', records: [record],
  })) as IndexedNameSummary[]
  const getPrimaryName = vi.fn<() => Promise<string | null>>(async () => null)
  const client = { getPrimaryName } as unknown as DuskDomainsIndexerClient
  const paused = await readIndexedPrimarySummaries(client, names)
  expect(getPrimaryName).toHaveBeenCalledTimes(1)
  expect(Object.values(paused).every(summary => summary.tone !== 'success')).toBe(true)
  getPrimaryName.mockResolvedValue(name)
  const restored = await readIndexedPrimarySummaries(client, names)
  expect(getPrimaryName).toHaveBeenCalledTimes(2)
  expect(restored[node].tone).toBe('success')
  expect(restored[namehashHex('another.dusk')].tone).toBe('warning')
})
