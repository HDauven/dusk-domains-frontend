import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Badge } from './Badge'
import { NameCard } from './NameCard'
import { NameChip } from './NameChip'
import { NameHeader } from '../../features/search/NameHeader'
import { SearchHero } from '../../features/search/SearchHero'
import { SiteFooter } from '../../app/SiteFooter'
import { MyDomainsView, type MyDomainsViewProps } from '../../features/domains/MyDomainsView'
import { NameCard as OwnedNameCard } from '../../features/domains/my-domains/NameCard'
import type { IndexedNameSummary } from '../../names/internal'

const name: IndexedNameSummary = {
  canonicalName: 'aurora.dusk', node: 'node', owner: 'owner', manager: 'owner', resolverId: null,
  expiresAt: null, graceEndsAt: null, status: 'active', lastEventType: 'name_registered',
  records: [], subnameCount: 0, activityCount: 0,
}
const text = (html: string) => html.replace(/<[^>]*>/g, '')

describe('Afterglow names and copy', () => {
  it('renders only the name when no profile records exist', () => {
    const html = renderToStaticMarkup(<NameCard name="aurora.dusk" />)
    expect(text(html)).toBe('aurora.dusk')
    expect(html).toContain('<em>.dusk</em>')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('Primary name')
  })

  it('uses the supplied description and avatar without inventing profile data', () => {
    const records = [
      { key: 'text.description' as const, value: 'Tools for Dusk.', visibility: 'public' as const, ttlSeconds: 300, updatedAt: '' },
      { key: 'avatar' as const, value: 'https://example.test/avatar.png', visibility: 'public' as const, ttlSeconds: 300, updatedAt: '' },
    ]
    const html = renderToStaticMarkup(<OwnedNameCard name={{ ...name, records }} currentBlockHeight={null} onOpen={vi.fn()} primary={undefined} selectedAddress="wallet" />)
    expect(html).toContain('Tools for Dusk.')
    expect(html).toContain('src="https://example.test/avatar.png"')
    expect(html).toContain('referrerPolicy="no-referrer"')
    expect(html).not.toContain('Primary name')
    const empty = renderToStaticMarkup(<OwnedNameCard name={name} currentBlockHeight={null} onOpen={vi.fn()} primary={undefined} selectedAddress="wallet" />)
    expect(empty).not.toContain('<img')
    expect(empty).not.toContain('monogram')
    expect(renderToStaticMarkup(<NameCard name="aurora.dusk" avatar="javascript:alert(1)" />)).not.toContain('<img')
  })

  it('keeps the full name in chips and distinguishes every lifecycle state in text', () => {
    const longName = `${'longname'.repeat(20)}.dusk`
    expect(text(renderToStaticMarkup(<NameChip name={longName} />))).toBe(longName)
    for (const [status, label] of [['available', 'Available'], ['taken', 'Taken'], ['reserved', 'Reserved'], ['expiring', 'Expiring'], ['grace', 'Grace period'], ['paused', 'Paused']] as const) {
      expect(text(renderToStaticMarkup(<Badge status={status} />))).toBe(label)
    }
  })

  it('does not label an owned profile as taken or invent a primary-name claim', () => {
    const html = text(renderToStaticMarkup(<NameHeader displayName="aurora.dusk" status="registered" records={[]} reserved={false} lifecycleLabel={null} primaryVerified={false} />))
    expect(html).not.toContain('Taken')
    expect(html).not.toContain('Primary name')
  })

  it('uses a plain home headline and footer', () => {
    const home = text(renderToStaticMarkup(<SearchHero checked={false} loading={false} query="" onQueryChange={vi.fn()} onCheckAvailability={vi.fn()} />))
    expect(home).toContain('Find your .dusk name')
    expect(home).toContain('One readable name for your Dusk address.')
    expect(home).not.toContain('Claim it once')
    expect(text(renderToStaticMarkup(<SiteFooter links={{ support: '', abuse: '', security: '', status: '' }} onMainViewChange={vi.fn()} />))).toBe('Dusk DomainsReferralsTreasury')
  })

  it('says what is missing and what to do in My names', () => {
    const props: MyDomainsViewProps = {
      currentBlockHeight: null,
      loading: false,
      myNames: [],
      myNamesError: '',
      pendingReservations: [],
      primarySummaries: {},
      onForgetPendingReservation: vi.fn(),
      onOpenIndexedName: vi.fn(),
      onOpenPendingReservation: vi.fn(),
      onSearchHome: vi.fn(),
      wallet: {
        selectedAddress: '',
        onConnectWallet: vi.fn(),
      },
    }
    expect(text(renderToStaticMarkup(<MyDomainsView {...props} />))).toContain('Connect a wallet to see its names.')
    const connected = text(renderToStaticMarkup(<MyDomainsView {...props}
      wallet={{ ...props.wallet, selectedAddress: "wallet" }} />))
    expect(connected).toContain('This wallet has no names. Search for a name to register.')
    expect(connected).not.toContain('good ones go first')
  })
})
