import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { validateRecordValue as validateFrozenRecord } from '@duskdomains/sdk'
import { expect, it, vi } from 'vitest'
import { editableRecordKeys } from '../../app/appConstants'
import { recordMutationPlan, socialRecordLink, validateRecordValue, type ResolverRecord, type ResolverRecordKey } from '../../names/internal'
import { DomainDetailsView } from './DomainDetailsView'
import { RecordDraftEditor } from './RecordDraftEditor'
import { recordLabel } from './recordPresentation'

const record = (key: ResolverRecordKey, value: string): ResolverRecord => ({ key, value, visibility: 'public', updatedAt: '', ttlSeconds: 3600 })
const social = ['text.x', 'text.discord', 'text.github', 'text.link'] as const

it('offers X, Discord, GitHub and another link as record types, with plain labels', () => {
  expect(editableRecordKeys).toEqual(expect.arrayContaining([...social]))
  // The contract holds at most 16 records per name.
  expect(editableRecordKeys.length).toBeLessThanOrEqual(16)
  expect(social.map(recordLabel)).toEqual(['X', 'Discord', 'GitHub', 'Link'])
  expect(recordLabel('text.description')).toBe('Description')
})

it('validates each social record by its own format, on top of the protocol\'s text rules', () => {
  const ok = (key: ResolverRecordKey, value: string) => expect(validateRecordValue(key, value), `${key}: ${value}`).toEqual([])
  const bad = (key: ResolverRecordKey, value: string) => expect(validateRecordValue(key, value).length, `${key}: ${value}`).toBeGreaterThan(0)
  for (const value of ['nightowls', '@nightowls_dusk', 'a']) ok('text.x', value)
  for (const value of ['night owls', '@toolonghandle_1234', 'https://x.com/nightowls', '']) bad('text.x', value)
  for (const value of ['https://discord.gg/nightowls', 'discord.gg/nightowls', 'https://discord.com/invite/Ab-12', 'maya_l', 'maya.lind']) ok('text.discord', value)
  for (const value of ['https://evil.example/discord.gg/x', 'Maya L', 'a', 'maya..lind']) bad('text.discord', value)
  for (const value of ['nightowls', 'night-owls', 'HDauven']) ok('text.github', value)
  for (const value of ['-owls', 'owls-', 'night--owls', 'night owls', 'a'.repeat(40)]) bad('text.github', value)
  for (const value of ['https://t.me/nightowls', 'https://www.linkedin.com/company/nightowls']) ok('text.link', value)
  for (const value of ['http://t.me/nightowls', 'javascript:alert(1)', 'https://user:pass@example.com', 't.me/nightowls']) bad('text.link', value)
  // Every accepted value is a valid protocol text record.
  for (const [key, value] of [['text.x', '@nightowls'], ['text.discord', 'discord.gg/nightowls'], ['text.github', 'night-owls'], ['text.link', 'https://t.me/nightowls']] as const) {
    expect(validateFrozenRecord(key, value)).toEqual([])
  }
})

it('saves social records under their keys and blocks values in the wrong format', () => {
  const plan = recordMutationPlan(editableRecordKeys, [], { 'text.x': '@nightowls', 'text.github': 'night owls' })
  expect(plan.mutations).toEqual([{ action: 'set', key: 'text.x', value: '@nightowls', ttlSeconds: 3600 }])
  expect(plan.invalid.map(item => item.key)).toEqual(['text.github'])
  // The message names the record as the editor does, not by its key.
  expect(plan.errors).toEqual([expect.stringMatching(/^GitHub: /)])
  expect(recordMutationPlan(editableRecordKeys, [], { 'text.description': 'Night\u0007owls' }).errors).toEqual([expect.stringMatching(/^Description: /)])
  // Every editable record's message uses the editor's own label.
  for (const key of editableRecordKeys) {
    const errors = recordMutationPlan(editableRecordKeys, [], { [key]: key === 'website' || key === 'avatar' ? 'http://insecure.example' : 'not valid\u0007' }).errors
    if (errors.length) expect(errors[0], key).toMatch(new RegExp(`^${recordLabel(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: `))
  }
})

it('helps fill in each social record', () => {
  const html = renderToStaticMarkup(<RecordDraftEditor editableRecordKeys={[...social]} recordDraftValues={{}} onDraftValueChange={vi.fn()}
    onUseWalletPublicAddress={vi.fn()} onUseWalletShieldedAddress={vi.fn(async () => {})} walletAddressAvailable={false} />)
  expect(html).toContain('Your X handle, like @nightowls.')
  expect(html).toContain('A Discord invite link, like discord.gg/nightowls, or your Discord username.')
  expect(html).toContain('Your GitHub user or organization name.')
  expect(html).toContain('Any https:// link, like a Telegram group or a LinkedIn page.')
  expect(html).toMatch(/aria-describedby="record-help-text\.x"/)
})

it('links social records on the profile, and never links a value it can\'t check', () => {
  expect(socialRecordLink('text.x', '@nightowls')).toEqual({ href: 'https://x.com/nightowls', text: '@nightowls' })
  expect(socialRecordLink('text.github', 'night-owls')).toEqual({ href: 'https://github.com/night-owls', text: 'night-owls' })
  expect(socialRecordLink('text.discord', 'discord.gg/nightowls')).toEqual({ href: 'https://discord.gg/nightowls', text: 'discord.gg/nightowls' })
  expect(socialRecordLink('text.discord', 'maya_l')).toBeNull()
  expect(socialRecordLink('text.link', 'https://t.me/nightowls')).toEqual({ href: 'https://t.me/nightowls', text: 't.me/nightowls' })
  // Another app may store anything under these keys.
  expect(socialRecordLink('text.x', 'javascript:alert(1)')).toBeNull()
  expect(socialRecordLink('text.link', 'http://t.me/nightowls')).toBeNull()
  const html = renderToStaticMarkup(<DomainDetailsView displayName="nightowlshq.dusk" onManageRecords={vi.fn()} onSubdomains={vi.fn()}
    parentResolverRecords={[record('text.x', '@nightowls'), record('text.discord', 'maya_l'), record('text.github', 'javascript:alert(1)')]} paysPreviousOwner={null}
    primaryVerification={{ tone: 'muted', title: '', description: '', displayValue: '' }} subnames={[]} viewerAuthority=""
    activity={{ activityEntries: [], currentBlockHeight: null, formatActivityTime: vi.fn(), onActivity: vi.fn() }} />)
  expect(html).toContain('<a href="https://x.com/nightowls" target="_blank" rel="noreferrer nofollow">@nightowls')
  expect(html).toContain('<span>Discord</span><p>maya_l</p>')
  expect(html).not.toContain('href="javascript')
})

it('lists social links among the records in llms.txt', () => {
  expect(readFileSync('scripts/site/llms.txt', 'utf8')).toContain('a description, and links to X, Discord, GitHub and one other site')
})
