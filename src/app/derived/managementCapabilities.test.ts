import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { canManageActiveName } from './managementCapabilities'
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
