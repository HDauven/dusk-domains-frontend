// @vitest-environment happy-dom
import { act, useLayoutEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { deriveRecordCapabilities } from '../../app/derived/recordCapabilities'
import { createResolverRecord, recordMutationPlan, type CoreRecordMutationInput, type ResolverRecord, type ResolverRecordKey } from '../../names/internal'
import { RecordsView } from './RecordsView'
import { useDomainRecordState } from './useDomainRecordState'

const keys: ResolverRecordKey[] = ['website', 'avatar', 'text.description', 'moonlight_address']
const saved: CoreRecordMutationInput[][] = []
let root: Root
let state: ReturnType<typeof useDomainRecordState>
let records: ResolverRecord[]

function Probe({ editable = keys, nodeHex = 'node', showRecords = true }: { editable?: ResolverRecordKey[], nodeHex?: string, showRecords?: boolean }) {
  const current = useDomainRecordState({ displayName: 'alpha.dusk', nodeHex, editableRecordKeys: editable })
  useLayoutEffect(() => { state = current })
  const { canSaveRecords } = deriveRecordCapabilities({ ...current,
    walletAuthorized: true, selectedAddress: 'wallet', recordBusy: false,
    currentBlockHeight: 100, nowSeconds: 0, displayName: 'alpha.dusk', nodeHex: 'node', selectedAuthority: 'owner',
    managedName: { owner: 'owner', manager: 'owner', expiresAt: 1000, graceEndsAt: 2000 },
    primaryBusy: false, primaryEndpoint: '', primaryEndpointErrors: [], connectedPrimaryName: null,
    renewalBusy: false, subnameBusy: false, subnameLabel: '', subnameManager: '',
  })
  // Another section of the name page, or another page, replaces the records panel.
  if (!showRecords) return null
  return <RecordsView displayName="alpha.dusk" editableRecordKeys={editable} resolverRecords={current.resolverRecords}
    actions={{ canRemoveRecords: true, canSaveRecords, error: '', recordBusy: false, txState: null,
      onSaveRecords: async () => { saved.push(current.recordDraftMutations); current.setRecordDrafts({}); return true } }}
    draft={{ ...current,
      onDiscardDrafts: () => current.setRecordDrafts({}),
      onDiscardDraft: key => { if (key) current.setRecordDrafts(drafts => Object.fromEntries(Object.entries(drafts).filter(([draftKey]) => draftKey !== key))) },
      onDraftValueChange: (key, value) => current.setRecordDrafts(drafts => ({ ...drafts, [key]: value })) }}
    wallet={{ onUseWalletPublicAddress: vi.fn(), onUseWalletShieldedAddress: vi.fn(), walletAddressAvailable: false }} />
}

const button = (name: string) => {
  const found = [...document.querySelectorAll('button')].find(item => (item.getAttribute('aria-label') ?? item.textContent?.trim()) === name)
  if (!found) throw new Error(`No button ${name}: ${[...document.querySelectorAll('button')].map(item => item.getAttribute('aria-label') ?? item.textContent).join(' | ')}`)
  return found as HTMLButtonElement
}
const click = (name: string) => act(async () => button(name).click())
const unload = () => {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}
async function type(label: string, value: string) {
  const input = document.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  saved.length = 0
  records = [createResolverRecord('website', 'https://old.example'), createResolverRecord('text.description', 'Old description')]
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root')!)
  await act(async () => root.render(<Probe />))
  await act(async () => state.setResolverRecordSets({ node: records }))
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals() })

it('stages edits, additions and removals, then saves them in one transaction', async () => {
  await click('Edit Website')
  await type('Website record', 'https://new.example')
  await click('Add another change')
  expect(document.body.textContent).toContain('https://new.example')
  await click('Add record')
  await act(async () => {
    const select = document.querySelector('#record-type') as HTMLSelectElement
    select.value = 'avatar'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await type('Avatar record', 'https://new.example/avatar.png')
  await click('Add another change')
  await click('Remove Description')
  const review = document.querySelector('[aria-label="Record changes to save"]')!
  expect(review.textContent).toContain('https://new.example/avatar.png')
  expect(review.textContent).toContain('Remove')
  expect(saved).toEqual([])
  await click('Save 3 changes')
  expect(saved).toHaveLength(1)
  expect(saved[0].map(mutation => [mutation.action, mutation.key])).toEqual([
    ['set', 'website'], ['set', 'avatar'], ['clear', 'text.description'],
  ])
})

it('keeps a single edit to one click and one transaction', async () => {
  await click('Edit Website')
  await type('Website record', 'https://single.example')
  await click('Save record')
  expect(saved).toEqual([[expect.objectContaining({ action: 'set', key: 'website', value: 'https://single.example' })]])
})

it('lets each staged change be undone, or all of them discarded', async () => {
  await click('Remove Website')
  await click('Remove Description')
  // The pending changes are a named region, so a screen reader can find them.
  expect(document.querySelector('section[aria-label="Unsaved record changes"]')?.textContent).toContain('2 changes to save')
  await click('Undo Website')
  expect(state.recordDraftMutations.map(mutation => mutation.key)).toEqual(['text.description'])
  await click('Discard changes')
  expect(state.recordDraftMutations).toEqual([])
  expect(document.querySelector('[aria-label="Record changes to save"]')).toBeNull()
})

it('shows the over-limit message in the staged changes and blocks saving', async () => {
  const many = Array.from({ length: 9 }, (_, index) => `text.k${index}` as ResolverRecordKey)
  await act(async () => root.render(<Probe editable={many} />))
  await act(async () => state.setRecordDrafts(Object.fromEntries(many.map(key => [key, 'a']))))
  expect(document.querySelector('[role="alert"]')?.textContent).toBe('A record update allows at most 8 changes. Remove 1 change before saving.')
  expect(button('Save 9 changes').disabled).toBe(true)
})

it('stages removal of records the editor cannot write and refuses a 17th record', () => {
  const email = createResolverRecord('text.email' as ResolverRecordKey, 'hello@example.test')
  expect(recordMutationPlan(['website'], [email], { 'text.email': '' }).mutations).toEqual([{ action: 'clear', key: 'text.email' }])
  const full = Array.from({ length: 16 }, (_, index) => createResolverRecord(`text.k${index}` as ResolverRecordKey, 'x'))
  expect(recordMutationPlan(['website'], full, { website: 'https://example.test' }).errors).toEqual(['A name can hold at most 16 records. Remove 1 record before adding this one.'])
  expect(recordMutationPlan(['website', 'text.k0'], full, { website: 'https://example.test', 'text.k0': '' }).errors).toEqual([])
})

it('keeps a staged change when its editor is reopened and cancelled', async () => {
  await click('Edit Website')
  await type('Website record', 'https://staged.example')
  await click('Add another change')
  await click('Edit Website')
  await type('Website record', 'https://abandoned.example')
  await click('Cancel')
  expect(state.recordDraftMutations).toEqual([expect.objectContaining({ action: 'set', key: 'website', value: 'https://staged.example' })])
  await click('Edit Description')
  await click('Cancel')
  expect(state.recordDraftMutations.map(mutation => mutation.key)).toEqual(['website'])
})

it('keeps a staged new record editable, with its controls', async () => {
  await act(async () => state.setResolverRecordSets({ node: [] }))
  await click('Add record')
  await type('Website record', 'https://first.example')
  await click('Add another change')
  await click('Edit Website')
  const input = () => document.querySelector('input[aria-label="Website record"]') as HTMLInputElement | null
  expect(input()?.value).toBe('https://first.example')
  expect(document.body.textContent).not.toContain('No records yet')
  await type('Website record', 'https://second.example')
  await click('Add another change')
  expect(state.recordDraftMutations).toEqual([expect.objectContaining({ action: 'set', key: 'website', value: 'https://second.example' })])
  await click('Edit Website')
  await type('Website record', 'https://abandoned.example')
  await click('Cancel')
  expect(state.recordDraftMutations).toEqual([expect.objectContaining({ value: 'https://second.example' })])
  await click('Edit Website')
  await click('Save record')
  expect(saved).toEqual([[expect.objectContaining({ action: 'set', key: 'website', value: 'https://second.example' })]])
})

it('keeps a staged new record\'s editor while its value is empty or invalid', async () => {
  await act(async () => state.setResolverRecordSets({ node: [] }))
  await click('Add record')
  await type('Website record', 'https://first.example')
  await click('Add another change')
  await click('Edit Website')
  const input = () => document.querySelector('input[aria-label="Website record"]') as HTMLInputElement | null
  for (const value of ['', 'not a url']) {
    await type('Website record', value)
    expect(input()?.value).toBe(value)
    expect(button('Cancel').disabled).toBe(false)
    expect(document.body.textContent).not.toContain('No records yet')
  }
  expect(document.querySelector('[role="alert"]')?.textContent).toBe('Website: Use a valid HTTPS URL.')
  await click('Cancel')
  expect(state.recordDraftMutations).toEqual([expect.objectContaining({ action: 'set', key: 'website', value: 'https://first.example' })])
})

it('shows staged values that can\'t be saved after the panel closes, to fix or undo', async () => {
  await click('Edit Website')
  await type('Website record', 'not a url')
  await act(async () => root.render(<Probe showRecords={false} />))
  await act(async () => root.render(<Probe />))
  await click('Add record')
  await act(async () => {
    const select = document.querySelector('#record-type') as HTMLSelectElement
    select.value = 'avatar'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await type('Avatar record', 'nope')
  await act(async () => root.render(<Probe showRecords={false} />))
  await act(async () => root.render(<Probe />))
  // Both rows show the value that can't be saved and why, with a way to fix or undo it.
  const notes = [...document.querySelectorAll('.record-entry .record-staged')].map(note => note.textContent)
  expect(notes).toEqual(['Can\'t be saved: Use a valid HTTPS URL.', 'Can\'t be saved: Use a valid HTTPS URL.'])
  expect(document.body.textContent).toContain('not a url')
  expect(document.body.textContent).toContain('nope')
  await click('Undo Website')
  await click('Edit Avatar')
  await type('Avatar record', 'https://alpha.example/a.png')
  await click('Save record')
  expect(saved).toEqual([[expect.objectContaining({ action: 'set', key: 'avatar', value: 'https://alpha.example/a.png' })]])
})

it('asks before unloading only for staged values that change something', async () => {
  // Typing a record's saved value back, or emptying a new one, stages nothing.
  await click('Edit Website')
  await type('Website record', 'https://new.example')
  await type('Website record', 'https://old.example')
  await act(async () => root.render(<Probe showRecords={false} />))
  await act(async () => root.render(<Probe />))
  await click('Add record')
  await type('Avatar record', 'https://alpha.example/a.png')
  await type('Avatar record', '')
  expect(Object.keys(state.recordDrafts)).toEqual(['website', 'avatar'])
  expect(unload()).toBe(false)
  await act(async () => { state.searchActions.reset(); root.render(<Probe nodeHex="other" showRecords={false} />) })
  expect(unload()).toBe(false)
  // A value that can't be saved yet is still unsaved work.
  await act(async () => root.render(<Probe />))
  await act(async () => state.setResolverRecordSets({ node: records }))
  await click('Edit Website')
  await type('Website record', 'not a url')
  expect(unload()).toBe(true)
  await act(async () => root.render(<Probe nodeHex="other" showRecords={false} />))
  expect(unload()).toBe(true)
})

it('keeps staged changes when the records panel closes and opens again', async () => {
  await click('Remove Description')
  await click('Edit Website')
  await type('Website record', 'https://kept.example')
  await click('Add another change')
  await act(async () => root.render(<Probe showRecords={false} />))
  expect(state.recordDraftMutations).toHaveLength(2)
  await act(async () => root.render(<Probe />))
  expect(document.querySelector('section[aria-label="Unsaved record changes"]')?.textContent).toContain('2 changes to save')
})

it('keeps each name\'s staged changes while another name is open', async () => {
  await click('Edit Website')
  await type('Website record', 'https://kept.example')
  await click('Add another change')
  // Opening another name resets the name page.
  await act(async () => { state.searchActions.reset(); root.render(<Probe nodeHex="other" showRecords={false} />) })
  expect(state.recordDraftMutations).toEqual([])
  await act(async () => root.render(<Probe />))
  await act(async () => state.setResolverRecordSets({ node: records }))
  expect(state.recordDraftMutations).toEqual([expect.objectContaining({ action: 'set', key: 'website', value: 'https://kept.example' })])
})

it('asks before the page unloads while record changes are not saved', async () => {
  expect(unload()).toBe(false)
  await click('Remove Website')
  expect(unload()).toBe(true)
  // Changes staged for a name that is no longer open still count.
  await act(async () => root.render(<Probe nodeHex="other" showRecords={false} />))
  expect(unload()).toBe(true)
  await act(async () => root.render(<Probe />))
  await click('Undo Website')
  expect(unload()).toBe(false)
})

it('drops staged changes that fresh records show were saved, and keeps the rest', async () => {
  await click('Edit Website')
  await type('Website record', 'https://saved.example')
  await click('Add another change')
  // A save finished while another name was open: the change is on chain, its draft is left.
  await act(async () => root.render(<Probe nodeHex="other" showRecords={false} />))
  const saved = [createResolverRecord('website', 'https://saved.example'), createResolverRecord('text.description', 'Old description')]
  await act(async () => state.searchActions.hydrate('node', saved))
  expect(unload()).toBe(false)
  // A change the records don't show yet stays staged.
  await act(async () => root.render(<Probe />))
  await act(async () => state.setRecordDrafts({ website: 'https://newer.example' }))
  await act(async () => state.searchActions.hydrate('node', saved))
  expect(state.recordDraftMutations).toEqual([expect.objectContaining({ key: 'website', value: 'https://newer.example' })])
})
