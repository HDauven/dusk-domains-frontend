import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { canManageActiveName } from './managementCapabilities'
import { deriveRecordCapabilities } from './recordCapabilities'
import { clearDomainRecord } from '../../features/domains/clearDomainRecord'
import { useIndexedNameHydration } from '../../features/search/useIndexedNameHydration'
import { readIndexedName } from '../../features/search/indexedNameReads'
import { applyIndexedNameHydration } from '../../features/search/applyIndexedNameHydration'

vi.mock('../../features/search/indexedNameReads', () => ({ readIndexedName: vi.fn() }))
vi.mock('../../features/search/applyIndexedNameHydration', () => ({ applyIndexedNameHydration: vi.fn() }))

it('limits active name actions to that target’s owner or manager, and blocks removal before a wallet call', async () => {
  const parent = { owner: 'owner', manager: 'manager', expiresAt: 200 }
  expect(canManageActiveName(parent, 'OWNER', 100)).toBe(true)
  expect(canManageActiveName(parent, 'manager', 100)).toBe(true)
  expect(canManageActiveName(parent, 'other', 100)).toBe(false)
  expect(canManageActiveName(parent, '', 100)).toBe(false)
  expect(canManageActiveName(parent, 'owner', 200)).toBe(false)
  expect(canManageActiveName(parent, 'owner', null)).toBe(false)
  expect(canManageActiveName(undefined, 'owner', 100)).toBe(false)
  const child = { ...parent, owner: 'child-owner', manager: 'child-manager' }
  expect(canManageActiveName(child, 'owner', 100)).toBe(false)
  expect(canManageActiveName(child, 'child-manager', 100)).toBe(true)
  const submitNameWrite = vi.fn(), ensureContractAuthorityForLiveWrite = vi.fn(), setRecordError = vi.fn()
  await clearDomainRecord({ activeRecordTarget: { name: 'name.dusk', node: 'node' }, canRemoveRecords: false,
    walletSetupState: 'connected', walletAuthorized: true, selectedAddress: 'owner', recordBusy: false,
    setRecordError, submitNameWrite, ensureContractAuthorityForLiveWrite } as never,
  { key: 'website' } as never)
  expect(submitNameWrite).not.toHaveBeenCalled()
  expect(ensureContractAuthorityForLiveWrite).not.toHaveBeenCalled()
  expect(setRecordError).toHaveBeenLastCalledWith('Connect the manager wallet before removing this record.')
})

it('refreshes unknown height before applying lifecycle state and refuses unhealthy hydration', async () => {
  let hydrate!: ReturnType<typeof useIndexedNameHydration>['hydrateNameFromIndexer']
  const setCurrentBlockHeight = vi.fn()
  const props = { currentBlockHeight: null, setCurrentBlockHeight }
  function Probe() {
    hydrate = useIndexedNameHydration(props as never).hydrateNameFromIndexer
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  const reads = {} as Awaited<ReturnType<typeof readIndexedName>>
  vi.mocked(readIndexedName).mockResolvedValue(reads)
  const getHealth = vi.fn().mockResolvedValue({ ok: true, currentBlockHeight: 100 })
  await hydrate({ getHealth } as never, {} as never)
  expect(setCurrentBlockHeight).toHaveBeenCalledExactlyOnceWith(100)
  expect(applyIndexedNameHydration).toHaveBeenCalledExactlyOnceWith({ ...props, currentBlockHeight: 100 }, reads)
  getHealth.mockResolvedValue({ ok: false, currentBlockHeight: 200 })
  await expect(hydrate({ getHealth } as never, {} as never)).rejects.toThrow('still syncing')
  expect(readIndexedName).toHaveBeenCalledOnce()
  expect(applyIndexedNameHydration).toHaveBeenCalledOnce()
})

it('refuses renewal for a subname and for a name at or past its expiry', () => {
  const ready = { walletAuthorized: true, selectedAddress: 'owner', nodeHex: 'node', renewalBusy: false,
    displayName: 'alphavnuc.dusk', managedNameExpiresAt: 200, currentBlockHeight: 100 as number | null, nowSeconds: 0,
    subnameLabel: '', subnameManager: '', primaryEndpointErrors: [], recordDraftMutations: [], recordDraftErrors: [] }
  const canRenew = (overrides: Partial<typeof ready> = {}) => (
    deriveRecordCapabilities({ ...ready, ...overrides } as never).canRenewName
  )
  expect(canRenew()).toBe(true)
  expect(canRenew({ displayName: 'pay.alphavnuc.dusk' })).toBe(false)
  expect(canRenew({ currentBlockHeight: 199 })).toBe(true)
  expect(canRenew({ currentBlockHeight: 200 })).toBe(false)
  // An expiry read without a block height is a time, compared with the clock.
  const unixExpiry = { managedNameExpiresAt: 1_800_000_000, currentBlockHeight: null }
  expect(canRenew({ ...unixExpiry, nowSeconds: 1_799_999_999 })).toBe(true)
  expect(canRenew({ ...unixExpiry, nowSeconds: 1_800_000_000 })).toBe(false)
})
