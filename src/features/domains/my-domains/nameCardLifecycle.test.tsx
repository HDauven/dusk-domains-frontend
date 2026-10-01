import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { IndexedNameSummary } from '../../../names/internal'
import { NameHeader } from '../../search/NameHeader'
import { formatLifecycleDay, lifecycleBadgeCopy, subnameExpiryCopy } from '../domainFormat'
import { nameCardLifecycle } from './nameCardLifecycle'

function summary(canonicalName: string): IndexedNameSummary {
  return {
    node: `0x${'12'.repeat(32)}`,
    canonicalName,
    owner: '0xowner',
    manager: '0xowner',
    resolverId: null,
    expiresAt: null,
    graceEndsAt: null,
    expiresAtBlockHeight: 1_000_000,
    graceEndsAtBlockHeight: 1_300_000,
    status: 'active',
    lastEventType: 'name_registered',
    records: [],
    subnameCount: 0,
    activityCount: 1,
  }
}

describe('name lifecycle labels', () => {
  it('offers renewal after expiry until grace ends', () => {
    expect(nameCardLifecycle(summary('aurora.dusk'), 10).copy).toMatch(/^Renews by /)
    const held = nameCardLifecycle(summary('aurora.dusk'), 1_100_000)
    expect(held.copy).toMatch(/^Expired .+\. Renew by .+ to keep it$/)
    expect(nameCardLifecycle(summary('aurora.dusk'), 1_300_000).copy).toMatch(/^Expired /)
  })

  it('reads expiry from the indexer when heights are missing', () => {
    const noHeights = { expiresAtBlockHeight: null, graceEndsAtBlockHeight: null }
    expect(nameCardLifecycle({ ...summary('aurora.dusk'), ...noHeights, expiresAt: '2020-01-01T00:00:00Z' }, 10).copy).toBe('Expired 2020-01-01')
    expect(nameCardLifecycle({ ...summary('aurora.dusk'), ...noHeights, expiresAt: '2999-01-01T00:00:00Z' }, 10).copy).toBe('Renews by 2999-01-01')
    const inGrace = { ...summary('aurora.dusk'), expiresAt: '2020-01-01T00:00:00Z', graceEndsAt: '2999-01-01T00:00:00Z' }
    expect(nameCardLifecycle({ ...inGrace, ...noHeights }, 10).copy).toBe('Expired 2020-01-01. Renew by 2998-12-31 to keep it')
    expect(nameCardLifecycle(inGrace, null).copy).toBe('Expired 2020-01-01. Renew by 2998-12-31 to keep it')
    expect(nameCardLifecycle({ ...inGrace, canonicalName: 'pay.aurora.dusk' }, null).copy).toBe('Expired 2020-01-01')
    // Without the current height, the indexer's date stands in for the height's.
    const dated = { ...summary('aurora.dusk'), expiresAt: '2020-09-29T12:00:00Z' }
    expect(nameCardLifecycle({ ...dated, status: 'expired' }, null).copy).toBe('Expired 2020-09-29')
    expect(nameCardLifecycle({ ...summary('aurora.dusk'), status: 'expired' }, null).copy).toBe('Expired')
    expect(nameCardLifecycle({ ...dated, expiresAt: '2999-01-01T00:00:00Z' }, null).copy).toBe('Renews by 2999-01-01')
  })

  it('promises renewal through the root only before expiry', () => {
    expect(subnameExpiryCopy('pay.aurora.dusk', 1_000_000, 'inherits_parent', 10, 0)).toContain('renewing aurora.dusk renews it too')
    const expired = subnameExpiryCopy('pay.aurora.dusk', 1_000_000, 'inherits_parent', 1_100_000, 0)
    expect(expired).toMatch(/^Expired on .+\. It expired with aurora\.dusk\.$/)
    expect(expired).not.toMatch(/renew/i)
  })

  it.each([0, 1_300_000])('shows the root expiry before expiry with grace end %s', (graceEndsAt) => {
    for (const currentBlockHeight of [10, 999_999]) {
      const expiry = formatLifecycleDay(1_000_000, currentBlockHeight, 0)
      expect(lifecycleBadgeCopy('aurora.dusk', 1_000_000, currentBlockHeight, 0, graceEndsAt)).toBe(`Renews by ${expiry}`)
    }
  })

  it('shows the grace deadline only after root expiry', () => {
    for (const currentBlockHeight of [1_000_000, 1_100_000, 1_299_999]) {
      const expiry = formatLifecycleDay(1_000_000, currentBlockHeight, 0)
      const grace = formatLifecycleDay(1_300_000, currentBlockHeight, 0)
      expect(lifecycleBadgeCopy('aurora.dusk', 1_000_000, currentBlockHeight, 0, 1_300_000)).toBe(`Expired ${expiry}. Renew by ${grace}`)
    }
    const expiry = formatLifecycleDay(1_000_000, 1_300_000, 0)
    expect(lifecycleBadgeCopy('aurora.dusk', 1_000_000, 1_300_000, 0, 1_300_000)).toBe(`Expired ${expiry}. Anyone can register it`)
    expect(lifecycleBadgeCopy('aurora.dusk', 0, 1_100_000, 0)).toBeNull()
  })

  it('uses derived grace boundaries in root badges and cards', () => {
    const name = { ...summary('aurora.dusk'), graceEndsAtBlockHeight: null }
    for (const currentBlockHeight of [1_000_000, 1_259_199, 1_259_200]) {
      const expiry = formatLifecycleDay(1_000_000, currentBlockHeight, 0)
      const grace = formatLifecycleDay(1_259_200, currentBlockHeight, 0)
      expect(lifecycleBadgeCopy('aurora.dusk', 1_000_000, currentBlockHeight, 0)).toBe(currentBlockHeight < 1_259_200
        ? `Expired ${expiry}. Renew by ${grace}` : `Expired ${expiry}. Anyone can register it`)
      expect(nameCardLifecycle(name, currentBlockHeight).copy.includes('Renew by')).toBe(currentBlockHeight < 1_259_200)
    }
  })

  it.each([null, '2027-02-14T08:00:00.000Z'])('uses the estimate margin in badges and cards with grace end %s', (graceEndsAt) => {
    const expiresAt = 1_800_000_000
    // 30 days after expiry, less the one-hour estimate margin.
    const deadline = 1_802_588_400
    const name = { ...summary('aurora.dusk'), expiresAt: new Date(expiresAt * 1000).toISOString(), graceEndsAt,
      expiresAtBlockHeight: null, graceEndsAtBlockHeight: null }
    const graceSeconds = graceEndsAt ? Date.parse(graceEndsAt) / 1000 : 0
    const clock = vi.spyOn(Date, 'now')
    try {
      for (const nowSeconds of [deadline - 1, deadline, deadline + 3_599, deadline + 3_600]) {
        clock.mockReturnValue(nowSeconds * 1000)
        const badge = lifecycleBadgeCopy('aurora.dusk', expiresAt, 1_000, nowSeconds, graceSeconds)
        const card = nameCardLifecycle(name, 1_000).copy
        if (nowSeconds < deadline) {
          const grace = formatLifecycleDay(deadline, null, nowSeconds)
          expect(badge).toContain(`Renew by ${grace}`)
          expect(card).toContain(`Renew by ${grace} to keep it`)
        } else {
          expect(badge).toContain('Renewal closed')
          expect(card).not.toContain('Renew by')
          expect(badge).not.toContain('Anyone can register it')
        }
      }
    } finally {
      clock.mockRestore()
    }
  })

  it('shows only when a subname ends, since it is never renewed on its own', () => {
    expect(nameCardLifecycle(summary('pay.aurora.dusk'), 10).copy).toMatch(/^Expires /)
    expect(nameCardLifecycle(summary('pay.aurora.dusk'), 999_000).copy).toMatch(/^Expires soon: /)
    expect(nameCardLifecycle(summary('pay.aurora.dusk'), 1_100_000).copy).toMatch(/^Expired [^.]*$/)

    for (const currentBlockHeight of [10, 1_000_000, 1_300_000]) {
      const expiry = formatLifecycleDay(1_000_000, currentBlockHeight, 0)
      for (const graceEndsAt of [0, 1_300_000]) {
        expect(lifecycleBadgeCopy('pay.aurora.dusk', 1_000_000, currentBlockHeight, 0, graceEndsAt))
          .toBe(`${currentBlockHeight < 1_000_000 ? 'Expires' : 'Expired'} ${expiry}`)
      }
    }
    const header = renderToStaticMarkup(
      <NameHeader displayName="aurora.dusk" lifecycleLabel="Expired 2028-09-29" primaryVerified={false} records={[]} reserved={false} status="registered" />,
    )
    expect(header.replaceAll('<!-- -->', '')).toContain('>Expired 2028-09-29<')
  })
})
