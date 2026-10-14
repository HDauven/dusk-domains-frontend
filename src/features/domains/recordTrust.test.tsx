import { renderToStaticMarkup } from 'react-dom/server'
import { encodeBase58 } from '@duskdomains/sdk'
import { expect, it, vi } from 'vitest'
import type { ResolverRecord, ResolverRecordKey } from '../../names/internal'
import { account } from '../../test/frozenFixtures'
import { recordLabel as activityRecordLabel } from '../activity/activityCopy'
import { paysPreviousOwner } from '../../app/useAppSearchProps'
import type { IndexedNameSummary } from '../../names/internal'
import { DomainDetailsView } from './DomainDetailsView'
import { NameCard } from './my-domains/NameCard'
import { RecordsView } from './RecordsView'
import { recordLabel } from './recordPresentation'

const record = (key: string, value: string, extra: Partial<ResolverRecord> = {}): ResolverRecord => ({
  key: key as ResolverRecordKey, value, visibility: 'public', ttlSeconds: 300, updatedAt: '', ...extra,
})

function profile(parentResolverRecords: ResolverRecord[], canEdit = false) {
  return renderToStaticMarkup(<DomainDetailsView displayName="noahedge.dusk" canEdit={canEdit}
    parentResolverRecords={parentResolverRecords}
    onManageRecords={vi.fn()}
    onSubdomains={vi.fn()}
    paysPreviousOwner={null}
    primaryVerification={{ tone: 'neutral', title: 'Primary name', description: '', displayValue: '' }}
    subnames={[]}
    viewerAuthority=""
    activity={{ activityEntries: [], currentBlockHeight: null, formatActivityTime: vi.fn(), onActivity: vi.fn() }} />)
}
const sendTo = (html: string) => html.slice(html.indexOf('id="send-heading"'), html.indexOf('</section>', html.indexOf('id="send-heading"')))

// noahedge.dusk on the drill chain: its moonlight_address record holds the bytes of "not-a-real-address",
// which the chain read shows base58-encoded, and the indexer's /resolve reports as invalid_record.
const invalidDuskAddress = encodeBase58(new TextEncoder().encode('not-a-real-address'))

it('never offers a Dusk address that fails the SDK’s own validation as a payment target', () => {
  const html = profile([record('moonlight_address', invalidDuskAddress), record('website', 'https://example.test')])
  const send = sendTo(html)
  expect(send).not.toContain(invalidDuskAddress)
  expect(send).not.toContain('aria-label="Copy Dusk address"')
  expect(send).not.toContain('To pay noahedge.dusk')
  expect(send).toContain('This name’s Dusk address isn’t valid, so it isn’t shown. Don’t send funds to this name until its owner fixes it.')
})

it('never offers an address the resolver marks invalid, even when it looks valid', () => {
  const flagged = record('moonlight_address', account, { resolverIssue: 'moonlight_address: Moonlight addresses must use a dusk1-prefixed address or Dusk account address form.' })
  const send = sendTo(profile([flagged]))
  expect(send).not.toContain(account)
  expect(send).not.toContain('Copy Dusk address')
  expect(send).toContain('This name’s Dusk address isn’t valid')
  // The owner is told where to fix it.
  const owner = sendTo(profile([flagged], true))
  expect(owner).toContain('Your Dusk address record isn’t valid, so it isn’t shown.')
  expect(owner).toContain('>Update it under Records</button>')
  expect(owner).not.toContain('No addresses yet.')
  // The same address, unflagged, is offered.
  const ok = sendTo(profile([record('moonlight_address', account)]))
  expect(ok).toContain(`title="${account}"`)
  expect(ok).toContain('aria-label="Copy Dusk address"')
})

it.each([
  ['address.btc', 'Bitcoin address', 'not-a-bitcoin-address'],
  ['address.eth', 'Ethereum address', '0x123'],
  ['evm_address', 'DuskEVM Address', 'javascript:alert(1)'],
  ['dusk_contract', 'Dusk contract', '0x1234'],
] as const)('never offers an invalid %s', (key, label, value) => {
  const send = sendTo(profile([record(key, value)]))
  expect(send).not.toContain(value)
  expect(send).not.toContain(`Copy ${label}`)
})

// The drill's look-alike keys, beside the canonical website key.
const confusable = [
  record('Website', 'https://evil.example/look-alike-key'),
  record('website​', 'https://evil.example/zero-width-key'),
  record('text.website', 'https://evil.example/text-website'),
  record('text.dusk_address', invalidDuskAddress),
  record('service_endpoint.website', 'https://evil.example/endpoint'),
  record('Avatar', 'https://evil.example/avatar.png'),
  record('text.X', 'evilhandle'),
  record('Moonlight_address', account),
]

it('gives look-alike keys neither a trusted label nor a link, and shows their raw keys marked as custom', () => {
  const html = profile([...confusable, record('website', 'https://example.test')])
  expect(html).not.toContain('href="https://evil.example')
  expect(html).not.toContain('href="https://x.com/evilhandle"')
  // Only the canonical website key is labelled Website and linked.
  expect(html.split('<span>Website</span>')).toHaveLength(2)
  expect(html).toContain('href="https://example.test"')
  for (const label of ['Dusk address', 'Avatar', 'X']) expect(html).not.toContain(`<span>${label}</span>`)
  // Raw keys, invisible characters spelled out, each marked.
  for (const raw of ['Website', 'website[U+200B]', 'text.website', 'text.dusk_address', 'service_endpoint.website', 'Avatar', 'text.X', 'Moonlight_address']) {
    expect(html).toContain(`<code class="record-key-raw">${raw}</code>`)
  }
  expect(html.split('Custom record')).toHaveLength(confusable.length + 1)
  // A look-alike payment key is not a payment target.
  expect(sendTo(html)).not.toContain(account)
})

it('names a look-alike key by its raw key in the records list and in activity text', () => {
  const html = renderToStaticMarkup(<RecordsView resolverRecords={confusable}
    displayName="noahedge.dusk"
    editableRecordKeys={['website']}
    actions={{ canRemoveRecords: true, recordBusy: false, canSaveRecords: false, error: '', onSaveRecords: vi.fn(), txState: null }}
    draft={{ recordDraftMutations: [], criticalRecordChange: false, onDiscardDrafts: vi.fn(), onDiscardDraft: vi.fn(), onDraftValueChange: vi.fn(), recordDraftErrors: [], recordDraftValues: {} }}
    wallet={{ onUseWalletPublicAddress: vi.fn(), onUseWalletShieldedAddress: vi.fn(), walletAddressAvailable: true }} />)
  expect(html).not.toContain('<strong>Website</strong>')
  expect(html).toContain('<code class="record-key-raw">website[U+200B]</code>')
  expect(html).toContain('aria-label="Remove “website[U+200B]”"')
  expect(html).not.toContain('aria-label="Edit')
  // Prose quotes a raw key, so it never reads as the canonical label.
  expect(recordLabel('website')).toBe('Website')
  expect(recordLabel('Website' as ResolverRecordKey)).toBe('“Website”')
  expect(activityRecordLabel('website​')).toBe('“website[U+200B]”')
  expect(activityRecordLabel('line\nbreak')).toBe('“line[U+000A]break”')
  expect(activityRecordLabel('text.dusk_address')).toBe('“text.dusk_address”')
  for (const [key, label] of [['moonlight_address', 'Dusk address'], ['text.x', 'X'], ['text.description', 'Description'], ['avatar', 'Avatar']]) {
    expect(activityRecordLabel(key)).toBe(label)
  }
})

it('never names an invalid Dusk address as where a name pays, on its page or in My names', () => {
  const owner = `0x${'11'.repeat(32)}`
  const other = (value: string) => [record('moonlight_address', value)]
  expect(paysPreviousOwner({ owner, records: other(invalidDuskAddress), selectedAddress: account, selectedAuthority: owner })).toBeNull()
  expect(paysPreviousOwner({ owner, records: [record('moonlight_address', account, { resolverIssue: 'moonlight_address: invalid' })], selectedAddress: 'another', selectedAuthority: owner })).toBeNull()
  const card = (records: ResolverRecord[]) => renderToStaticMarkup(<NameCard currentBlockHeight={10} name={{ node: '0x01', canonicalName: 'noahedge.dusk',
    owner, manager: owner, records, status: 'active', subnameCount: 0, activityCount: 0, expiresAt: null, graceEndsAt: null, expiresAtBlockHeight: 5_000 } as unknown as IndexedNameSummary}
    onOpen={vi.fn()} primary={undefined} selectedAddress={account} />)
  const invalid = card(other(invalidDuskAddress))
  expect(invalid).toContain('Invalid address')
  expect(invalid).not.toContain('Pays another wallet')
  expect(invalid).not.toContain('No address')
  expect(card([])).toContain('No address')
})
