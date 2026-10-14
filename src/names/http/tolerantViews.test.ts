import { expect, it } from 'vitest'
import { activityActions } from '../../features/activity/activityActions'
import { createDuskDomainsIndexerClient } from './client'

// An indexer upgrade can add an event or a value the site doesn't know yet. It must not take the
// page down: a well-formed unknown value is kept and shown plainly, while malformed data is refused.
function client(body: unknown) {
  return createDuskDomainsIndexerClient({
    baseUrl: 'http://indexer.test/api',
    fetch: (async () => Response.json(body)) as typeof fetch,
  })
}
const node = `0x${'ab'.repeat(32)}`
const entry = (eventType: unknown, extra: Record<string, unknown> = {}) => ({
  id: `row-${String(eventType)}`, eventType, node, name: 'aurora.dusk', actor: '', timestamp: '2026-10-13T10:00:00.000Z', blockHeight: 120, ...extra,
})
const registered = entry('registration', { target: `0x${'11'.repeat(32)}` })

it('reads an activity page with an event type the site doesn’t know, and shows it plainly', async () => {
  const page = await client({ activity: [entry('market_fee_route_changed'), registered], nextCursor: null }).getActivityPage(node)
  expect(page.activity.map(row => row.eventType)).toEqual(['market_fee_route_changed', 'registration'])
  expect(activityActions(page.activity, {}).map(action => action.title)).toContain('Market fee route changed')
})

it.each([
  ['an event type that isn’t a plain identifier', entry('<img src=x onerror=alert(1)>')],
  ['an event type that isn’t a string', entry(7)],
  ['an entry without its node', { ...entry('registration'), node: undefined }],
])('still refuses an activity page with %s', async (_, malformed) => {
  await expect(client({ activity: [malformed, registered], nextCursor: null }).getActivityPage(node))
    .rejects.toThrow('Dusk Domains indexer returned an invalid activity response.')
})

const treasury = (extra: Record<string, unknown>) => ({
  initialized: true, source: 'vault', protocolAccruedLux: '9', referralLiabilityLux: '2', operator: null, events: [], claims: [], ...extra,
})

it.each(['fee_source_changed', 'beneficiary_reserved'])('reads the treasury when its last event is %s', async lastEventType => {
  expect(await client(treasury({ lastEventType })).getTreasury()).toMatchObject({ lastEventType, availableLux: '9' })
})

it('reads the treasury when its last fee has a reason the site doesn’t know', async () => {
  expect(await client(treasury({ lastEventType: 'fee_received', lastFeeReason: 'market' })).getTreasury()).toMatchObject({ lastFeeReason: 'market' })
})

it.each([
  ['a last event that isn’t a plain identifier', { lastEventType: 'fee received; drop table' }],
  ['a last event that isn’t a string', { lastEventType: 12 }],
  ['a fee reason that isn’t a plain identifier', { lastFeeReason: '<b>' }],
])('still refuses a treasury with %s', async (_, extra) => {
  await expect(client(treasury(extra)).getTreasury()).rejects.toThrow('Dusk Domains indexer returned an invalid treasury response.')
})
