// @vitest-environment happy-dom
import { act, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import type { ActivityEntry, DuskDomainsIndexerClient } from '../../names/internal'
import { DomainDetailsView } from '../domains/DomainDetailsView'
import { ActivityHistoryView } from './ActivityHistoryView'
import { useSubnameActivity, type SubnameActivity, type SubnameFeed } from './subnameActivity'

const bytes = (fill: number) => Array(32).fill(fill) as number[]
const hex = (value: number[]) => `0x${value.map(byte => byte.toString(16).padStart(2, '0')).join('')}`
const root = bytes(7), sub = bytes(8), sam = bytes(0x11)
const row = (eventType: string, data: unknown, at: number[], tx = 'tx-take'): ActivityEntry => ({ id: `${eventType}:${hex(at)}:${tx}`, eventType, node: hex(at), name: '', actor: '',
  timestamp: '2026-10-11T19:38:13.000Z', blockHeight: 2909, txId: tx, data } as ActivityEntry)
const counters = (tx: string) => row('root_counters_changed', { root, counters: { generation: '1', next_serial: '4', next_epoch: '3', next_custody: '1', revision: '7' } }, root, tx)
const parent = [counters('tx-take')]
const name = { key: { root, node: sub }, incarnation: { generation: '1', serial: '2' }, label: 'sam', owner: sam, manager: sam }
const feed: SubnameFeed = { name: 'sam.nightowlshq.dusk', node: hex(sub), holders: { owner: hex(sam), manager: hex(sam) }, partial: false,
  entries: [row('authorities_changed', { name, previous_owner: sam, previous_manager: sam, actor: sam, reason: 'Holder', data_cleared: true }, sub)] }
const activity: SubnameActivity = { feeds: [feed], complete: true }

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

it('shows a subname change on the parent with its subname, action and actor', () => {
  const html = renderToStaticMarkup(<ActivityHistoryView activityEntries={parent} currentBlockHeight={3000} displayName="nightowlshq.dusk"
    formatActivityTime={() => ''} loading={false} recentWarnings={[]} viewerAuthority={hex(sam)} subnameActivity={activity} />)
  expect(html).toContain('<strong>sam.nightowlshq.dusk: Records and primary name cleared</strong>')
  expect(html).toContain('By you')
  expect(html).not.toContain('Subname changed')
})

it('names subname changes in the Recent list of the parent\'s profile', () => {
  const html = renderToStaticMarkup(<DomainDetailsView displayName="nightowlshq.dusk" onManageRecords={vi.fn()} onSubdomains={vi.fn()} parentResolverRecords={[]}
    paysPreviousOwner={null} primaryVerification={{ tone: 'muted', title: '', description: '', displayValue: '' }} subnames={[]} viewerAuthority={hex(sam)}
    activity={{ activityEntries: parent, currentBlockHeight: 3000, formatActivityTime: () => '', onActivity: vi.fn(), subnameActivity: activity }} />)
  expect(html).toContain('sam.nightowlshq.dusk: Records and primary name cleared')
  expect(html).not.toContain('Subname changed')
})

it('reads the subnames\' whole history for the CSV download', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let blob: Blob | null = null
  vi.spyOn(URL, 'createObjectURL').mockImplementation(value => { blob = value as Blob; return 'blob:history' })
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const loadSubnameActivity = vi.fn(async () => activity)
  document.body.innerHTML = '<div id="root"></div>'
  const container = createRoot(document.getElementById('root')!)
  await act(async () => container.render(<ActivityHistoryView activityEntries={parent} currentBlockHeight={3000} displayName="nightowlshq.dusk"
    formatActivityTime={() => ''} loading={false} recentWarnings={[]} viewerAuthority="" loadFullHistory={async () => parent} loadSubnameActivity={loadSubnameActivity} />))
  await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent?.includes('Download CSV'))!.click())
  expect(loadSubnameActivity).toHaveBeenCalledWith(parent)
  expect(download).toHaveBeenCalledOnce()
  expect(await blob!.text()).toContain('"sam.nightowlshq.dusk: Records and primary name cleared"')
  await act(async () => container.unmount())
})

it('keeps the latest page\'s subnames, and keeps rows explained while it reads them again', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const pending: Array<{ node: string, resolve: (page: { activity: ActivityEntry[], nextCursor: null }) => void }> = []
  const getActivityPage = vi.fn((node: string) => new Promise<{ activity: ActivityEntry[], nextCursor: null }>(resolve => { pending.push({ node, resolve }) }))
  const client = { getActivityPage } as unknown as DuskDomainsIndexerClient
  const subnames = [{ name: feed.name, node: feed.node, owner: hex(sam), manager: hex(sam), updatedAt: '2026-10-11T19:40:00.000Z' }]
  let seen: SubnameActivity = { feeds: [], complete: true }
  function Probe({ entries }: { entries: ActivityEntry[] }) {
    const loaded = useSubnameActivity(client, hex(root), entries, subnames)
    useLayoutEffect(() => { seen = loaded })
    return null
  }
  document.body.innerHTML = '<div id="root"></div>'
  const container = createRoot(document.getElementById('root')!)
  await act(async () => container.render(<Probe entries={parent} />))
  // A newer page with another unexplained transaction starts a second read before the first answers.
  const newer = [counters('tx-newer'), ...parent]
  await act(async () => container.render(<Probe entries={newer} />))
  expect(pending).toHaveLength(2)
  await act(async () => pending[1].resolve({ activity: [row('slot_changed', { name, previous: null, current: null, reason: 'Mutation' }, sub, 'tx-newer'), ...feed.entries], nextCursor: null }))
  expect(seen.feeds[0].entries).toHaveLength(2)
  // The older answer arrives last and is ignored.
  await act(async () => pending[0].resolve({ activity: feed.entries, nextCursor: null }))
  expect(seen.feeds[0].entries).toHaveLength(2)
  // While a third page is read, the rows already explained stay explained.
  await act(async () => container.render(<Probe entries={[counters('tx-third'), ...newer]} />))
  expect(pending).toHaveLength(3)
  expect(seen.feeds[0].entries).toHaveLength(2)
  // A page with nothing to explain shows nothing from the last one.
  await act(async () => container.render(<Probe entries={[]} />))
  expect(seen.feeds).toEqual([])
  await act(async () => container.unmount())
})
