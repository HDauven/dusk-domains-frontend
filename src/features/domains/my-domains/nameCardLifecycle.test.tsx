import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { IndexedNameSummary } from '../../../names/internal'
import { NameHeader } from '../../search/NameHeader'
import { lifecycleBadgeCopy, subnameExpiryCopy } from '../domainFormat'
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
  it('promises no renewal once a name has expired', () => {
    expect(nameCardLifecycle(summary('aurora.dusk'), 10).copy).toMatch(/^Renews by /)
    const held = nameCardLifecycle(summary('aurora.dusk'), 1_100_000)
    expect(held.copy).toMatch(/^Expired .+\. Held until .+, then anyone can register it$/)
    expect(held.copy).not.toMatch(/renew/i)
    expect(nameCardLifecycle(summary('aurora.dusk'), 1_300_000).copy).toMatch(/^Expired /)
  })

  it('reads expiry from the indexer when heights are missing', () => {
    const noHeights = { expiresAtBlockHeight: null, graceEndsAtBlockHeight: null }
    expect(nameCardLifecycle({ ...summary('aurora.dusk'), ...noHeights, expiresAt: '2000-01-01T00:00:00Z' }, 10).copy).toBe('Expired 2000-01-01')
    expect(nameCardLifecycle({ ...summary('aurora.dusk'), ...noHeights, expiresAt: '2999-01-01T00:00:00Z' }, 10).copy).toBe('Renews by 2999-01-01')
    // Without the current height, the indexer's date stands in for the height's.
    const dated = { ...summary('aurora.dusk'), expiresAt: '2026-09-29T12:00:00Z' }
    expect(nameCardLifecycle({ ...dated, status: 'expired' }, null).copy).toBe('Expired 2026-09-29')
    expect(nameCardLifecycle({ ...summary('aurora.dusk'), status: 'expired' }, null).copy).toBe('Expired')
    expect(nameCardLifecycle({ ...dated, expiresAt: '2999-01-01T00:00:00Z' }, null).copy).toBe('Renews by 2999-01-01')
  })

  it('promises renewal through the root only before expiry', () => {
    expect(subnameExpiryCopy('pay.aurora.dusk', 1_000_000, 'inherits_parent', 10, 0)).toContain('renewing aurora.dusk renews it too')
    const expired = subnameExpiryCopy('pay.aurora.dusk', 1_000_000, 'inherits_parent', 1_100_000, 0)
    expect(expired).toMatch(/^Expired on .+\. It expired with aurora\.dusk\.$/)
    expect(expired).not.toMatch(/renew/i)
  })

  it('shows only when a subname ends, since it is never renewed on its own', () => {
    expect(nameCardLifecycle(summary('pay.aurora.dusk'), 10).copy).toMatch(/^Expires /)
    expect(nameCardLifecycle(summary('pay.aurora.dusk'), 999_000).copy).toMatch(/^Expires soon: /)
    expect(nameCardLifecycle(summary('pay.aurora.dusk'), 1_100_000).copy).toMatch(/^Expired [^.]*$/)

    // Block heights 1,000,000 (expiry) against current heights before and after it.
    expect(lifecycleBadgeCopy('aurora.dusk', 1_000_000, 10, 0)).toMatch(/^Renews by /)
    expect(lifecycleBadgeCopy('pay.aurora.dusk', 1_000_000, 10, 0)).toMatch(/^Expires /)
    expect(lifecycleBadgeCopy('aurora.dusk', 1_000_000, 1_100_000, 0)).toMatch(/^Expired /)
    expect(lifecycleBadgeCopy('aurora.dusk', 0, 1_100_000, 0)).toBeNull()
    const header = renderToStaticMarkup(
      <NameHeader displayName="aurora.dusk" lifecycleLabel="Expired 2028-09-29" primaryVerified={false} records={[]} reserved={false} status="registered" />,
    )
    expect(header.replaceAll('<!-- -->', '')).toContain('>Expired 2028-09-29<')
  })
})
