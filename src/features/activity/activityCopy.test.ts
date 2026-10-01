import { describe, expect, it } from 'vitest'
import type { ActivityEntry } from '../../names/internal'
import { activityActor, activityDetail, activityEventDetail, activityTitle, recentTargetLabel } from './activityCopy'

const me = `0x${'19'.repeat(32)}`
const other = `0x${'ab'.repeat(32)}`
const address = 'oCqYsUMRqpRn2kSabH52Gt6FQCwH5JXj5MtRdYVtjMSJ73AFvdbPf98p3gz98fQwNy9ZBiDem6m9BivzURKFSKLYWP3N9JahSPZs9PnZ996P18rTGAjQTNFsxtbrKx79yWu'

function entry(eventType: ActivityEntry['eventType'], target: string, extra: Partial<ActivityEntry> = {}): ActivityEntry {
  return { id: eventType, eventType, node: '0x', name: 'alpha.dusk', actor: me, target, timestamp: '', blockHeight: 1, txId: null, ...extra } as ActivityEntry
}

describe('activity copy', () => {
  it('reads raw activity targets as plain words', () => {
    expect(activityDetail(entry('registration', me), me)).toBe('Owner: you')
    expect(activityDetail(entry('transfer', other), me)).toBe(`Owner: Owner ID ${other.slice(0, 10)}...${other.slice(-6)}`)
    expect(activityDetail(entry('renewal', '2029-09-26T15:55:33.000Z'))).toBe('Now runs until 2029-09-26')
    expect(activityDetail(entry('record_update', 'website'))).toBe('Website')
    expect(activityDetail(entry('primary_name', `moonlight_address:${address}`))).toBe('')
    expect(activityDetail(entry('subname_created', me, { name: 'pay.alpha.dusk' }))).toBe('pay.alpha.dusk')
    expect(activityDetail(entry('domain_bid_placed', '25000000000'))).toBe('25 DUSK')
  })

  it('keeps the complete primary address in event Details only', () => {
    for (const target of [address, `moonlight_address:${address}`]) {
      const primary = entry('primary_name', target)
      expect(activityDetail(primary)).toBe('')
      expect(activityEventDetail(primary)).toBe(`Dusk address: ${address}`)
    }
    expect(activityEventDetail(entry('primary_name', 'cleared'))).toBe('')
    expect(activityEventDetail(entry('record_update', 'website'))).toBe('Website')
  })

  it('names the viewer and the marketplace', () => {
    expect(activityActor(me.toUpperCase().replace('0X', '0x'), me)).toBe('You')
    expect(activityActor('marketplace', me)).toBe('Marketplace')
    expect(activityActor(other, me)).toMatch(/^Owner ID 0xabababab/)
    expect(activityTitle(entry('primary_name', ''))).toBe('Primary name changed')
  })

  it('labels recent-change warnings', () => {
    expect(recentTargetLabel('website', 'record_update')).toBe('Website')
    expect(recentTargetLabel(`moonlight_address:${address}`, 'primary_name')).toBe('Shown for oCqYsUMRqp...x79yWu')
  })
})
