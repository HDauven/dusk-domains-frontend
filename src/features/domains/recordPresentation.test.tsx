import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { STATIC_RECORD_DEFINITIONS, type ResolverRecord, type ResolverRecordKey } from '../../names/internal'
import { NameHeader } from '../search/NameHeader'
import { DomainDetailsView } from './DomainDetailsView'
import { RecordDraftEditor } from './RecordDraftEditor'
import { RecordsView } from './RecordsView'
import { recordLabel } from './recordPresentation'

const record = (key: ResolverRecordKey, value: string): ResolverRecord => ({
  key, value, visibility: 'public', ttlSeconds: 300, updatedAt: '',
})
const records = [record('text.description', 'Building tools for Dusk.'), record('text.display_name', 'Aurora'),
  record('website', 'https://example.test'), record('avatar', 'ipfs://avatar'),
  record('service_endpoint.chat', 'https://example.test/chat'), record('attestation_ref', 'urn:example:123'),
  record('moonlight_address', 'dusk1abcdefghijklmnopqrst')]

function profile(parentResolverRecords = records) {
  return renderToStaticMarkup(<DomainDetailsView displayName="aurora.dusk" parentResolverRecords={parentResolverRecords}
    activityEntries={[]} currentBlockHeight={null} formatActivityTime={vi.fn()} onActivity={vi.fn()}
    onManageRecords={vi.fn()} onSubdomains={vi.fn()} paysPreviousOwner={null}
    primaryVerification={{ tone: 'success', title: 'Primary name', description: 'Name and address match.', displayValue: 'aurora.dusk' }} subnames={[]} viewerAuthority="" />)
}

describe('record presentation', () => {
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
    expect(header('registered', records)).toContain('<span class="name-portrait-description">Building tools for Dusk.</span>')
    expect(header('registered', [])).not.toContain('name-portrait-description')
    expect(header('available', records)).not.toContain('name-portrait-description')
  })

  it('keeps record labels and prose consistent in the list', () => {
    const html = renderToStaticMarkup(<RecordsView resolverRecords={records} canRemoveRecords recordBusy={false} onClearRecord={vi.fn()} displayName="aurora.dusk" canSaveRecords={false} criticalRecordChange={false} editableRecordKeys={['website']} error="" onDiscardDrafts={vi.fn()} onDraftValueChange={vi.fn()} onSaveRecords={vi.fn()} onUseWalletPublicAddress={vi.fn()} onUseWalletShieldedAddress={vi.fn()} recordDraftErrors={[]} recordDraftValues={{}} txState={null} walletAddressAvailable />)
    expect(html).toContain('<strong>Description</strong>')
    expect(html).toContain('<p>Building tools for Dusk.</p>')
    expect(html).toContain('<code>urn:example:123</code>')
    expect(html).toContain('aria-label="Remove Description"')
  })

  it.each(['aurora.dusk', 'pay.aurora.dusk'])('shows unsupported records as read only with removal on %s', displayName => {
    const html = renderToStaticMarkup(<RecordsView resolverRecords={[record('text.email', 'hello@example.test'), record('website', 'https://example.test')]}
      canRemoveRecords recordBusy={false} onClearRecord={vi.fn()} displayName={displayName} canSaveRecords={false}
      criticalRecordChange={false} editableRecordKeys={['website']} error="" onDiscardDrafts={vi.fn()}
      onDraftValueChange={vi.fn()} onSaveRecords={vi.fn()} onUseWalletPublicAddress={vi.fn()}
      onUseWalletShieldedAddress={vi.fn()} recordDraftErrors={[]} recordDraftValues={{}} txState={null} walletAddressAvailable />)
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
