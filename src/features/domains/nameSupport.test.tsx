import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { createDuskDomainsRuntimeConfig, type NameSupport, type ResolverRecord } from '../../names/internal'
import { account } from '../../test/frozenFixtures'
import { useSearchWorkspaceFeature } from '../search/useSearchWorkspaceFeature'
import { DomainDetailsView } from './DomainDetailsView'

const text = (html: string) => html.replaceAll('&#x27;', '\'').replaceAll('<!-- -->', '').replaceAll('&amp;', '&')
const none: NameSupport = { wallets: [], explorers: [] }

it('reads the wallets and explorers that support .dusk names from the environment', () => {
  expect(createDuskDomainsRuntimeConfig({}).nameSupport).toEqual(none)
  expect(createDuskDomainsRuntimeConfig({
    VITE_DUSK_DOMAINS_NAME_WALLETS: ' Dusk Wallet|https://wallet.dusk.network , Other Wallet ,, ',
    VITE_DUSK_DOMAINS_NAME_EXPLORERS: 'Dusk Explorer|https://explorer.dusk.network,Bad Link|javascript:alert(1)',
  }).nameSupport).toEqual({
    wallets: [{ name: 'Dusk Wallet', url: 'https://wallet.dusk.network' }, { name: 'Other Wallet', url: null }],
    // A link that isn't https is dropped; the name stays.
    explorers: [{ name: 'Dusk Explorer', url: 'https://explorer.dusk.network' }, { name: 'Bad Link', url: null }],
  })
  // A name listed twice is shown once, with its first entry.
  expect(createDuskDomainsRuntimeConfig({ VITE_DUSK_DOMAINS_NAME_WALLETS: 'Dusk Wallet|https://wallet.dusk.network,dusk wallet,Other Wallet,Dusk Wallet|https://other.example' })
    .nameSupport.wallets).toEqual([{ name: 'Dusk Wallet', url: 'https://wallet.dusk.network' }, { name: 'Other Wallet', url: null }])
})

const record = (key: ResolverRecord['key'], value: string): ResolverRecord => ({ key, value, visibility: 'public', updatedAt: '', ttlSeconds: 300 })
const page = ({ canEdit = true, nameSupport = none, records = [record('moonlight_address', account)] } = {}) =>
  text(renderToStaticMarkup(<DomainDetailsView displayName="mayalind.dusk" isOwner={canEdit} canEdit={canEdit} nameSupport={nameSupport}
    onManageRecords={vi.fn()} onSubdomains={vi.fn()} parentResolverRecords={records} paysPreviousOwner={null}
    primaryVerification={{ tone: 'muted', title: '', description: '', displayValue: '' }} subnames={[]} viewerAuthority=""
    activity={{ activityEntries: [], currentBlockHeight: null, formatActivityTime: vi.fn(), onActivity: vi.fn() }} />))

it('tells the owner where a .dusk name works today, without claiming wallet support', () => {
  const html = page()
  expect(html).toContain('How people pay you')
  expect(html).toContain('Wallets can\'t send to .dusk names yet. Share your Dusk address instead.')
  expect(html).toContain('Anyone can look up mayalind.dusk on this site and copy its Dusk address.')
  expect(html).toContain('Apps can resolve it with the Dusk Domains API and SDK.')
  expect(html).not.toMatch(/in Dusk Wallet|explorer/i)
  // Visitors don't need it.
  expect(page({ canEdit: false })).not.toContain('How people pay you')
})

it('names the wallets and explorers once they support .dusk names', () => {
  const html = page({ nameSupport: { wallets: [{ name: 'Dusk Wallet', url: 'https://wallet.dusk.network' }, { name: 'Other Wallet', url: null }],
    explorers: [{ name: 'Dusk Explorer', url: 'https://explorer.dusk.network' }] } })
  expect(html.replace(/<[^>]+>/g, '')).toContain('People can send to mayalind.dusk in Dusk Wallet and Other Wallet. Other wallets need your Dusk address.')
  expect(html).toContain('<a href="https://wallet.dusk.network" target="_blank" rel="noreferrer">Dusk Wallet</a>')
  expect(html.replace(/<[^>]+>/g, '')).toContain('Dusk Explorer shows .dusk names.')
  expect(html).not.toContain('can\'t send to .dusk names')
})

it('asks for a Dusk address before promising one can be copied, or sent to', () => {
  const html = page({ records: [] })
  expect(html).toContain('Add your Dusk address under Records, so anyone can look up mayalind.dusk on this site and copy it.')
  expect(html).not.toContain('and copy its Dusk address.')
  // A wallet that supports names can't send to one without an address record.
  const listed = page({ records: [], nameSupport: { wallets: [{ name: 'Dusk Wallet', url: null }], explorers: [] } }).replace(/<[^>]+>/g, '')
  expect(listed).toContain('Once you add your Dusk address, people can send to mayalind.dusk in Dusk Wallet.')
  expect(listed).not.toContain('People can send to')
})

it('explains the Send to box to everyone', () => {
  expect(page({ canEdit: false })).toContain('To pay mayalind.dusk, copy an address below into a wallet.')
  expect(page({ canEdit: false, nameSupport: { wallets: [{ name: 'Dusk Wallet', url: null }], explorers: [] } }))
    .toContain('To pay mayalind.dusk, send to it in Dusk Wallet, or copy an address below into another wallet.')
  expect(page({ canEdit: false, records: [] })).not.toContain('To pay mayalind.dusk')
})

it('says a listed wallet can send to the name only when it has the Dusk address that wallet needs', () => {
  // Another chain's address is something to copy, not what a Dusk wallet sends to.
  const ethereum = [record('address.eth', `0x${'ab'.repeat(20)}`)]
  const support: NameSupport = { wallets: [{ name: 'Dusk Wallet', url: null }], explorers: [] }
  const visitor = page({ canEdit: false, records: ethereum, nameSupport: support })
  expect(visitor).toContain('To pay mayalind.dusk, copy an address below into a wallet.')
  expect(visitor).not.toContain('in Dusk Wallet')
  // The owner is told what to add, as before.
  expect(page({ records: ethereum, nameSupport: support }).replace(/<[^>]+>/g, ''))
    .toContain('Once you add your Dusk address, people can send to mayalind.dusk in Dusk Wallet.')
  // With the Dusk address beside it, the wallet can.
  expect(page({ canEdit: false, records: [...ethereum, record('moonlight_address', account)], nameSupport: support }))
    .toContain('To pay mayalind.dusk, send to it in Dusk Wallet, or copy an address below into another wallet.')
})

it('passes the configured support to the name page', () => {
  const support: NameSupport = { wallets: [{ name: 'Dusk Wallet', url: null }], explorers: [] }
  const { searchProps } = useSearchWorkspaceFeature({ nameSupport: support, activityEntries: [], parentResolverRecords: [], nodeHex: 'node',
    viewerAuthority: '', displayName: 'mayalind.dusk', settingsProps: { managedName: { node: 'node', owner: 'o', manager: 'o' } },
    primaryProps: { primaryVerification: { verified: false } }, registrationProps: { wizard: { registrationComplete: false } }, resultStatus: 'registered' } as never)
  expect(searchProps.result.detailsProps.nameSupport).toBe(support)
})
