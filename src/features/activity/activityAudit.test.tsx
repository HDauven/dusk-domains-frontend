// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { createDuskDomainsIndexerClient, createDuskDomainsRuntimeConfig, encodeBase58, type ActivityEntry } from '../../names/internal'
import { explorerTransactionUrl } from '../../app/explorer'
import { ActivityHistoryView } from './ActivityHistoryView'
import { DomainDetailsView } from '../domains/DomainDetailsView'
import { activityCsv } from './activityCsv'
import { indexedSubnameToState } from '../../app/indexerReadHelpers'
import { frozenView } from '../../names/http/frozenViews'

const bytes = (fill: number, length = 32) => Array(length).fill(fill) as number[]
const root = bytes(7)
const nameRef = { key: { root, node: root }, incarnation: { generation: '1', serial: '1' } }
const payerKey = Array.from({ length: 96 }, (_, index) => (index * 7 + 3) % 256)
const payer = encodeBase58(payerKey)
const txId = 'ab'.repeat(32)
const registered = {
  id: 'r', eventType: 'root_registered', node: `0x${'07'.repeat(32)}`, name: '', actor: '', blockHeight: 443, txId,
  timestamp: '2026-10-11T12:47:13.000Z',
  data: { name: { ...nameRef, label: 'alpha', expires_at: String(443 + 3_153_600) }, reason: 'Paid', payer: { kind: 'Moonlight', bytes: payerKey },
    fee_lux: '10000000000', premium_lux: '0', referral_lux: '0' },
} as ActivityEntry
const props = {
  activityEntries: [registered], currentBlockHeight: 449, displayName: 'alpha.dusk', formatActivityTime: (value: string) => value,
  loading: false, recentWarnings: [], viewerAuthority: '',
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('shows each action with its exact UTC time, relative age, actor and explorer link', () => {
  const html = renderToStaticMarkup(<ActivityHistoryView {...props} explorerUrl="https://explorer.dusk.network" />)
  expect(html).toContain('Registered for 1 year · 10 DUSK')
  expect(html).toContain('<time dateTime="2026-10-11T12:47:13.000Z">2026-10-11 12:47 UTC</time>')
  expect(html).toContain('<small>just now</small>')
  expect(html).toContain(`By ${payer.slice(0, 10)}...${payer.slice(-6)}`)
  expect(html).toContain(`href="https://explorer.dusk.network/transactions/transaction/?id=${txId}"`)
  expect(html).not.toMatch(/root counters|slot changed/i)
  // Without an explorer the transaction ID stays visible and copyable, but unlinked.
  const plain = renderToStaticMarkup(<ActivityHistoryView {...props} />)
  expect(plain).not.toContain('explorer.dusk.network')
  expect(plain).toContain(txId)
})

it('waits for the next page before showing a transaction the page may have cut off', () => {
  const primary = { ...registered, id: 'p', eventType: 'primary_changed', txId: 'cd'.repeat(32), blockHeight: 500, timestamp: '2026-10-11T13:00:03.000Z',
    data: { endpoint: payerKey, previous: null, current: { endpoint: payerKey, name: nameRef }, reason: 'Set' } } as ActivityEntry
  const entries = [primary, registered]
  expect(renderToStaticMarkup(<ActivityHistoryView {...props} activityEntries={entries} hasMore />)).not.toContain('Registered for 1 year')
  expect(renderToStaticMarkup(<ActivityHistoryView {...props} activityEntries={entries} />)).toContain('Registered for 1 year')
  const details = renderToStaticMarkup(<DomainDetailsView displayName="alpha.dusk" onManageRecords={vi.fn()} onSubdomains={vi.fn()} parentResolverRecords={[]}
    paysPreviousOwner={null} primaryVerification={{ status: 'none' } as never} subnames={[]} viewerAuthority=""
    activity={{ activityEntries: entries, hasMore: true, currentBlockHeight: 501, formatActivityTime: value => value, onActivity: vi.fn() }} />)
  expect(details).toContain('Primary name set')
  expect(details).not.toContain('Registered for 1 year')
})

it('exports the full history as CSV, oldest first, with full values and safe cells', () => {
  const later = { ...registered, id: 'p', eventType: 'primary_changed', txId: 'cd'.repeat(32), blockHeight: 500, timestamp: '2026-10-11T13:00:03.000Z',
    data: { endpoint: payerKey, previous: null, current: { endpoint: payerKey, name: nameRef }, reason: 'Set' } } as ActivityEntry
  const csv = activityCsv([later, registered], { explorerUrl: 'https://explorer.dusk.network' })
  const lines = csv.trim().split('\r\n')
  expect(lines[0]).toBe('"Date (UTC)","Block","Action","Details","By","Transaction","Explorer link"')
  expect(lines[1]).toBe(`"2026-10-11T12:47:13Z","443","Registered for 1 year · 10 DUSK","","${payer}","${txId}","https://explorer.dusk.network/transactions/transaction/?id=${txId}"`)
  expect(lines[2]).toContain('"Primary name set"')
  const injected = { ...registered, id: 'x', eventType: 'unknown_topic' as ActivityEntry['eventType'], data: {}, txId: undefined }
  // A custom record key is quoted as it is, and no cell starts a spreadsheet formula.
  const injectedCsv = activityCsv([{ ...injected, eventType: 'record_update', data: undefined, target: '=HYPERLINK("x")', actor: '' } as ActivityEntry], {})
  expect(injectedCsv).toContain(`"“=HYPERLINK(""x"")”"`)
  expect(injectedCsv).not.toMatch(/(^|,)"[=+\-@]/m)
})

it('downloads every page of the history, not only the loaded one', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const created: Blob[] = []
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { created.push(blob as Blob); return 'blob:history' })
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const older = { ...registered, id: 'old', txId: 'ef'.repeat(32), blockHeight: 200, data: { ...registered.data as object, name: { ...nameRef, expires_at: String(200 + 3_153_600) } } } as ActivityEntry
  const loadFullHistory = vi.fn(async () => [registered, older])
  const host = document.createElement('div')
  const view = createRoot(host)
  await act(async () => view.render(<ActivityHistoryView {...props} loadFullHistory={loadFullHistory} />))
  const button = [...host.querySelectorAll('button')].find(item => item.textContent?.includes('Download CSV'))!
  await act(async () => button.click())
  expect(loadFullHistory).toHaveBeenCalledOnce()
  expect(click).toHaveBeenCalledOnce()
  const text = await created[0].text()
  expect(text.trim().split('\r\n')).toHaveLength(3)
  expect(host.querySelector('a[download]')).toBeNull()
  await act(async () => view.unmount())
})

it('links transactions only to a configured explorer', () => {
  expect(createDuskDomainsRuntimeConfig({}).explorerUrl).toBeNull()
  expect(createDuskDomainsRuntimeConfig({ VITE_DUSK_DOMAINS_EXPLORER_URL: 'https://explorer.dusk.network/' }).explorerUrl).toBe('https://explorer.dusk.network')
  expect(createDuskDomainsRuntimeConfig({ VITE_DUSK_DOMAINS_EXPLORER_URL: 'javascript:alert(1)' }).explorerUrl).toBeNull()
  expect(explorerTransactionUrl('https://apps.testnet.dusk.network/explorer', txId)).toBe(`https://apps.testnet.dusk.network/explorer/transactions/transaction/?id=${txId}`)
  expect(explorerTransactionUrl(null, txId)).toBeNull()
  expect(explorerTransactionUrl('https://explorer.dusk.network', 'not a hash')).toBeNull()
})

it('accepts activity pages with logic-port and cession rows', async () => {
  const row = (eventType: string) => ({ id: eventType, eventType, node: registered.node, contractId: null, timestamp: registered.timestamp, blockHeight: 1, txId, actor: null, data: {} })
  const fetch = vi.fn(async () => Response.json({ activity: [row('controller_used'), row('root_ceded'), row('root_registered')], nextCursor: null }))
  const client = createDuskDomainsIndexerClient({ baseUrl: 'https://indexer.test/api', fetch })
  const page = await client.getActivityPage(registered.node)
  expect(page.activity.map(entry => entry.eventType)).toEqual(['controller_used', 'root_ceded', 'root_registered'])
})

it('credits record changes to the name\'s single holder and names subnames by serial on the name page', () => {
  const owner = `0x${'11'.repeat(32)}`, store = `0x${'7f'.repeat(32)}`
  const write = (id: string, eventType: string, data: unknown) => ({ id, eventType, node: registered.node, contractId: store, name: '', actor: '',
    timestamp: registered.timestamp, blockHeight: 500, txId: 'ee'.repeat(32), data }) as ActivityEntry
  const slot = { registry: bytes(0x7f), node: root, epoch: '1' }
  const entries = [
    write('c', 'root_counters_changed', { root, counters: { generation: '1', next_serial: '2', next_epoch: '2', next_custody: '1', revision: '2' } }),
    write('s', 'slot_changed', { name: nameRef, previous: null, current: { resolver: bytes(0xab), epoch: '1', count: 1, digest: bytes(1) }, reason: 'Initial' }),
    write('w', 'resolver_slot_written', { slot, snapshot: { records: [{ key: 'website', value: [...new TextEncoder().encode('https://a.example')], ttl_seconds: '300', updated_at: '500' }], count: 1, digest: bytes(1) } }),
  ]
  const html = renderToStaticMarkup(<ActivityHistoryView {...props} activityEntries={entries} holders={{ owner, manager: owner }} />)
  expect(html).toContain('Record updated: Website')
  expect(html).toContain(`By Account ID ${owner.slice(0, 10)}...${owner.slice(-6)}`)
  // Subname rows keep the serial the indexer reports, which is how a parent's history names them.
  const indexed = frozenView({ parentNode: registered.node, node: `0x${'09'.repeat(32)}`, parentName: 'alpha.dusk', name: 'maya.alpha.dusk', label: 'maya',
    owner, manager: owner, resolver: '', expiresAt: null, parentExpiresAt: null, expiryPolicy: 'inherits_parent', status: 'active', createdAt: null,
    expiresAtBlockHeight: 900, serial: '1', generation: '1' }, '/subnames')
  expect(indexedSubnameToState(indexed as never).serial).toBe('1')
})
