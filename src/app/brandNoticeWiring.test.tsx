import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { analyzeName, DEFAULT_FEE_CONFIG } from '../names/internal'
import { createDuskDomainsIndexerClient } from '../names/http/client'
import { createDuskDomainsRuntimeConfig } from '../names/config'
import { useNamePreview } from '../features/search/useNamePreview'
import { NameHeader } from '../features/search/NameHeader'
import { useAppSearchProps } from './useAppSearchProps'

// Website verification reaches the name page through the name's own data, bound to its current
// owner and website record; anything but a verified result leaves a watched brand unverified.
it.each(['none', 'checking', 'verified'] as const)('carries website verification (%s) and the configured report destination into name pages', async state => {
  const website = 'https://google.com'
  const verification = state === 'none' ? undefined : { owner: 'owner', website, result: { domain: 'google.com', status: state, checkedAt: '2026-10-08T00:00:00Z', dnssec: false } }
  const destination = 'https://github.com/HDauven/dusk-domains-frontend/issues/new?template=abuse-report.yml'
  const client = createDuskDomainsIndexerClient({ baseUrl: 'https://indexer.test', fetch: vi.fn(async () => new Response(JSON.stringify({
    ...analyzeName('google.dusk', DEFAULT_FEE_CONFIG), status: 'registered',
  }))) })
  const indexed = await client.searchName('google.dusk')
  let page!: ReturnType<typeof useAppSearchProps>['searchProps']['result']
  function Probe() {
    const namePreview = useNamePreview({ apiSearchResult: indexed, query: 'google.dusk', duration: 1, renewalYears: 1,
      currentBlockHeight: 100, managedNameExpiresAt: 200, nowSeconds: 0, feeConfig: DEFAULT_FEE_CONFIG })
    const managedName = { node: namePreview.nodeHex, owner: 'owner', expiresAt: 200, graceEndsAt: 300, websiteVerification: verification }
    page = useAppSearchProps({
      namePreview,
      appRuntime: { indexerClient: client, runtimeConfig: createDuskDomainsRuntimeConfig({ VITE_DUSK_DOMAINS_ABUSE_URL: destination }) },
      activityFeed: { activityEntries: [] }, domainRecordState: { parentResolverRecords: [{ key: 'website', value: website }] },
      domainState: { managedName }, economicsRuntime: { feeConfig: DEFAULT_FEE_CONFIG },
      mainViewRuntime: {}, registrationProps: { wizard: {} }, registrationState: {}, searchRuntime: {},
      searchState: { currentBlockHeight: 100, nowSeconds: 0 }, walletRuntime: { selectedAuthority: '' },
      derivedState: {}, management: { primaryProps: { primaryVerification: { verified: true } }, settingsProps: { managedName } },
    } as never).searchProps.result
    return <NameHeader {...page.headerProps} />
  }
  const html = renderToStaticMarkup(<Probe />)
  expect(html.includes('>Unverified</span>')).toBe(state !== 'verified')
  expect(page.abuseUrl).toBe(destination)
})
