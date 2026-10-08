// @vitest-environment happy-dom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { createManagedNameState } from '../../app/managedNameState'
import { safeNamehashHex } from './domainFormat'
import { useDomainManagementFeature } from './useDomainManagementFeature'
import type { UseDomainManagementFeatureProps } from './domainManagementFeatureTypes'
import { WebsiteVerificationPanel } from './settings/WebsiteVerificationPanel'
import { useIndexedNameHydration } from '../search/useIndexedNameHydration'
import type { UseIndexedNameHydrationProps } from '../search/indexedNameHydrationTypes'
import { searchActions } from '../search/test-fixtures/searchActions'
import type { ResolverRecord, WebsiteVerification } from '../../names/internal'

it.each(['owner', 'website', 'unchanged', 'refresh failure'])('shows only the refreshed website binding after Check now: %s', async change => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const name = 'aurora.dusk', node = safeNamehashHex(name)!
  const owner = change === 'owner' ? 'new-owner' : 'old-owner'
  const website = change === 'website' ? 'https://harbourline.com/changed' : 'https://harbourline.com'
  const verified: WebsiteVerification = { domain: 'harbourline.com', status: 'verified', checkedAt: '2026-10-08T12:00:00Z', dnssec: false }
  const record = { key: 'website', value: 'https://harbourline.com', visibility: 'public', ttlSeconds: 300, updatedAt: '' } as ResolverRecord
  const client = {
    verifyWebsite: vi.fn(async () => verified),
    searchName: vi.fn(async () => ({ canonical: name, status: 'registered' })),
    getHealth: vi.fn(async () => ({ ok: change !== 'refresh failure', currentBlockHeight: 10 })),
    getNameState: vi.fn(async () => ({ owner: 'old-owner', manager: 'old-owner', verification: { ...verified } })),
    resolveForward: vi.fn(async () => ({ records: [{ ...record }], verification: { ...verified } })),
    getActivityPage: vi.fn(async () => ({ activity: [] })), getAllSubnames: vi.fn(async () => []),
  }
  const chain = {
    getName: vi.fn(async () => ({ ok: true, value: { record: { owner, manager: owner, lifecycle: { expiresAtBlock: 100, graceEndsAtBlock: 200 } } } })),
    getRecords: vi.fn(async () => ({ ok: true, value: [{ ...record, value: website }] })),
  }
  const container = document.createElement('div'), root = createRoot(container)
  function Probe() {
    const [managedName, setManagedName] = useState({ ...createManagedNameState('resolver'), node, owner })
    const [records, setRecords] = useState<ResolverRecord[]>([{ ...record, value: website }])
    const refresh = useIndexedNameHydration({
      ...searchActions({ domain: { hydrate: value => setManagedName(value.managedName) }, records: { hydrate: (_node, value) => setRecords(value ?? []) } }),
      displayName: name, indexerClient: client, onChainClient: chain, selectedAddress: '', recordSourceContractId: 'resolver',
    } as unknown as UseIndexedNameHydrationProps)
    const views = useDomainManagementFeature({
      appRuntime: { indexerClient: client }, activityFeed: {}, derivedState: {}, economicsRuntime: {}, searchRuntime: refresh, searchState: {},
      namePreview: { result: {}, displayName: name, nodeHex: node, renewalPreviewLifecycle: {} },
      domainState: { managedName, setManagedName }, domainRecordState: { parentResolverRecords: records },
      walletRuntime: { submitNameWrite: {}, walletSession: {} },
    } as unknown as UseDomainManagementFeatureProps)
    return <WebsiteVerificationPanel name={name} owner={managedName.owner} website={website} {...views.settingsProps.websiteVerification} />
  }
  try {
    await act(async () => root.render(<Probe />))
    expect(container.textContent).toContain(`owner=${owner}`)
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Check now')!.click())
    expect(client.verifyWebsite).toHaveBeenCalledExactlyOnceWith(name)
    expect(client.getHealth).toHaveBeenCalledOnce()
    expect(container.textContent?.includes('Verified · harbourline.com')).toBe(change === 'unchanged')
    if (change === 'refresh failure') expect(container.textContent).toContain('Could not refresh website verification')
    else expect(chain.getName).toHaveBeenCalledExactlyOnceWith(name)
  } finally { await act(async () => root.unmount()) }
})
