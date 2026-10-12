// @vitest-environment happy-dom
import { act, useLayoutEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { deriveRecordCapabilities } from '../../app/derived/recordCapabilities'
import type { ResolverRecordKey } from '../../names/internal'
import { RecordsView } from './RecordsView'
import { useDomainRecordState } from './useDomainRecordState'

const keys: ResolverRecordKey[] = Array.from({ length: 8 }, (_, i) => `text.k${i}` as const)
const onSaveRecords = vi.fn(async () => false)
let root: Root
let state: ReturnType<typeof useDomainRecordState>

function Probe() {
  const records = useDomainRecordState({ displayName: 'alpha.dusk', nodeHex: 'node', editableRecordKeys: keys })
  useLayoutEffect(() => { state = records })
  const { canSaveRecords } = deriveRecordCapabilities({ ...records,
    walletAuthorized: true, selectedAddress: 'wallet', recordBusy: false,
    currentBlockHeight: 100, nowSeconds: 0, displayName: 'alpha.dusk', nodeHex: 'node', selectedAuthority: 'owner',
    managedName: { owner: 'owner', manager: 'owner', expiresAt: 1000, graceEndsAt: 2000 },
    primaryBusy: false, primaryEndpoint: '', primaryEndpointErrors: [], connectedPrimaryName: null,
    renewalBusy: false, subnameBusy: false, subnameLabel: '', subnameManager: '',
  })
  return <RecordsView displayName="alpha.dusk" editableRecordKeys={keys} resolverRecords={[]}
    actions={{ canRemoveRecords: true, canSaveRecords, error: '', onSaveRecords, recordBusy: false, txState: null }}
    draft={{ ...records, onDiscardDrafts: () => records.setRecordDrafts({}), onDiscardDraft: vi.fn(),
      onDraftValueChange: (key, value) => records.setRecordDrafts(current => ({ ...current, [key]: value })) }}
    wallet={{ onUseWalletPublicAddress: vi.fn(), onUseWalletShieldedAddress: vi.fn(), walletAddressAvailable: false }} />
}

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  onSaveRecords.mockClear()
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root')!)
  await act(async () => root.render(<Probe />))
  await act(async () => (document.querySelector('button') as HTMLButtonElement).click())
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals() })

it('shows the byte excess inline and blocks signing until the batch is within 4,096 bytes', async () => {
  // Seven-byte keys plus 505-byte values fill the complete batch exactly.
  const drafts = Object.fromEntries(keys.map(key => [key, 'é'.repeat(252) + 'a']))
  await act(async () => state.setRecordDrafts({ ...drafts, 'text.k0': drafts['text.k0'] + 'b' }))
  const save = document.querySelector('button[type="submit"]') as HTMLButtonElement
  expect(document.querySelector('[role="alert"]')?.textContent).toBe(
    'Record keys and values exceed the 4,096-byte batch limit. Remove changes or shorten values by at least 1 byte before saving.',
  )
  expect(save.disabled).toBe(true)
  await act(async () => document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  expect(onSaveRecords).not.toHaveBeenCalled()
  await act(async () => state.setRecordDrafts(drafts))
  expect(document.querySelector('[role="alert"]')).toBeNull()
  expect(save.disabled).toBe(false)
})

it.each(['\uD800', '\uDC00'])('shows malformed record Unicode inline and blocks signing: %j', async value => {
  await act(async () => state.setRecordDrafts({ 'text.k0': value }))
  expect(document.querySelector('[role="alert"]')?.textContent).toBe(
    'K0: Record value contains malformed Unicode. Remove or retype the invalid character.',
  )
  expect((document.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true)
  await act(async () => document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  expect(onSaveRecords).not.toHaveBeenCalled()
})
