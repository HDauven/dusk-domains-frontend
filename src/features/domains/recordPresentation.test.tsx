import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { STATIC_RECORD_DEFINITIONS, type ResolverRecord, type ResolverRecordKey } from '../../names/internal'
import { NameHeader } from '../search/NameHeader'
import { DomainDetailsView } from './DomainDetailsView'
import { RecordDraftEditor } from './RecordDraftEditor'
import { RecordsView } from './RecordsView'
import { isIdentifierRecord, recordLabel } from './recordPresentation'
import { editableRecordKeys } from '../../app/appConstants'
import { recordPlaceholder } from './domainFormat'

const record = (key: ResolverRecordKey, value: string): ResolverRecord => ({
  key, value, visibility: 'public', ttlSeconds: 300, updatedAt: '',
})
const records = [record('text.description', 'Building tools for Dusk.'), record('text.display_name', 'Aurora'),
record('website', 'https://example.test'), record('avatar', 'ipfs://avatar'),
record('service_endpoint.chat', 'https://example.test/chat'), record('attestation_ref', 'urn:example:123'),
record('moonlight_address', 'dusk1abcdefghijklmnopqrst')]

function profile(parentResolverRecords = records) {
  return renderToStaticMarkup(<DomainDetailsView displayName="aurora.dusk"
    parentResolverRecords={parentResolverRecords}
    onManageRecords={vi.fn()}
    onSubdomains={vi.fn()}
    paysPreviousOwner={null}
    primaryVerification={{ tone: 'success', title: 'Primary name', description: 'Name and address match.', displayValue: 'aurora.dusk' }}
    subnames={[]}
    viewerAuthority=""
    activity={{ activityEntries: [], currentBlockHeight: null, formatActivityTime: vi.fn(), onActivity: vi.fn() }} />)
}

describe('record presentation', () => {
  it('offers chain addresses in the editor and copies them after the Dusk address in the profile', () => {
    const chains = [
      ['address.btc', 'Bitcoin address', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'bc1...'],
      ['address.eth', 'Ethereum address', '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed', '0x...'],
      ['address.sol', 'Solana address', 'So11111111111111111111111111111111111111112', 'Base58 address'],
      ['address.evm', 'EVM address', '0x52908400098527886E0F7030069857D2E4169EE7', '0x...'],
    ] as const
    const html = profile([...chains.map(([key, , value]) => record(key, value)), ...records])
    const send = html.slice(html.indexOf('<ul class="address-list">'), html.indexOf('</ul>'))
    const editor = renderToStaticMarkup(<RecordDraftEditor editableRecordKeys={editableRecordKeys}
      recordDraftValues={{}} walletAddressAvailable={false} onDraftValueChange={vi.fn()} onUseWalletPublicAddress={vi.fn()} onUseWalletShieldedAddress={vi.fn()} />)
    for (const [key, label, value, placeholder] of chains) {
      expect(editableRecordKeys).toContain(key)
      expect(editor).toContain(`aria-label="${label} record"`)
      expect(recordPlaceholder(key)).toBe(placeholder)
      expect(isIdentifierRecord(key)).toBe(true)
      expect(send).toContain(`<span>${label}</span>`)
      expect(send).toContain(`title="${value}"`)
      expect(send).toContain(`aria-label="Copy ${label}"`)
      expect(send.indexOf(`<span>${label}</span>`)).toBeGreaterThan(send.indexOf('<span>Dusk address</span>'))
      expect(html.split(`<span>${label}</span>`)).toHaveLength(2)
    }
  })

  it('uses SDK labels for fixed keys and readable labels for dynamic keys', () => {
    for (const definition of STATIC_RECORD_DEFINITIONS) {
      expect(recordLabel(definition.key)).toBe(definition.key === 'moonlight_address' ? 'Dusk address' : definition.label)
    }
    const html = profile()
    for (const label of ['Display name', 'Website', 'Chat endpoint', 'Attestation reference', 'Dusk address']) {
      expect(html).toContain(`<span>${label}</span>`)
    }
    expect(html).not.toContain('text.description')
    expect(html).not.toContain('service_endpoint.chat')
  })

  it('renders prose in full as text, identifiers as code, and HTTPS records as links', () => {
    const html = profile()
    expect(html).not.toContain('Building tools for Dusk.')
    expect(html).not.toContain('ipfs://avatar')
    expect(html).toContain('<code>urn:example:123</code>')
    expect(html).toContain('href="https://example.test"')
    expect(html).toContain('href="https://example.test/chat"')
    expect(profile([record('text.description', 'https://example.test')])).not.toContain('https://example.test')
    expect(profile([record('website', 'javascript:alert(1)')])).not.toContain('href="javascript:')
  })

  it('shows a supplied description in the registered name header only', () => {
    const props = { displayName: 'aurora.dusk', lifecycleLabel: null, primaryVerified: false, reserved: false }
    const header = (status: 'registered' | 'available', values: ResolverRecord[]) => renderToStaticMarkup(<NameHeader {...props} status={status} records={values} />)
    expect(header('registered', records)).toContain('<p class="name-hero-description">Building tools for Dusk.</p>')
    expect(header('registered', [])).not.toContain('name-hero-description')
    expect(header('available', records)).not.toContain('name-hero-description')
  })

  it('keeps record labels and prose consistent in the list', () => {
    const html = renderToStaticMarkup(<RecordsView resolverRecords={records}
      displayName="aurora.dusk"
      editableRecordKeys={['website']}
      actions={{ canRemoveRecords: true, recordBusy: false, onClearRecord: vi.fn(), canSaveRecords: false, error: "", onSaveRecords: vi.fn(), txState: null }}
      draft={{ recordDraftMutations: [], criticalRecordChange: false, onDiscardDrafts: vi.fn(), onDraftValueChange: vi.fn(), recordDraftErrors: [], recordDraftValues: {} }}
      wallet={{ onUseWalletPublicAddress: vi.fn(), onUseWalletShieldedAddress: vi.fn(), walletAddressAvailable: true }} />)
    expect(html).toContain('<strong>Description</strong>')
    expect(html).toContain('<p>Building tools for Dusk.</p>')
    expect(html).toContain('<code>urn:example:123</code>')
    expect(html).toContain('aria-label="Remove Description"')
  })

  it.each(['aurora.dusk', 'pay.aurora.dusk'])('shows unsupported records as read only with removal on %s', displayName => {
    const html = renderToStaticMarkup(<RecordsView resolverRecords={[record('text.email', 'hello@example.test'), record('website', 'https://example.test')]}
      displayName={displayName}
      editableRecordKeys={['website']}
      actions={{ canRemoveRecords: true, recordBusy: false, onClearRecord: vi.fn(), canSaveRecords: false, error: "", onSaveRecords: vi.fn(), txState: null }}
      draft={{ recordDraftMutations: [], criticalRecordChange: false, onDiscardDrafts: vi.fn(), onDraftValueChange: vi.fn(), recordDraftErrors: [], recordDraftValues: {} }}
      wallet={{ onUseWalletPublicAddress: vi.fn(), onUseWalletShieldedAddress: vi.fn(), walletAddressAvailable: true }} />)
    expect(html).toContain('hello@example.test')
    expect(html).toContain('Read only')
    expect(html).toContain('aria-label="Remove Email"')
    expect(html).not.toContain('aria-label="Edit Email"')
    expect(html).toContain('aria-label="Edit Website"')
  })

  it('uses the same labels in the editor and its accessible inputs', () => {
    const editor = renderToStaticMarkup(<RecordDraftEditor editableRecordKeys={['text.description', 'website', 'avatar', 'moonlight_address']}
      recordDraftValues={{}} walletAddressAvailable={false} onDraftValueChange={vi.fn()} onUseWalletPublicAddress={vi.fn()} onUseWalletShieldedAddress={vi.fn()} />)
    for (const label of ['Description', 'Website', 'Avatar', 'Dusk address']) expect(editor).toContain(`aria-label="${label} record"`)
  })
})
