import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { analyzeName, DEFAULT_FEE_CONFIG } from '../names/internal'
import { createDuskDomainsIndexerClient } from '../names/http/client'
import { createDuskDomainsRuntimeConfig } from '../names/config'
import { useNamePreview } from '../features/search/useNamePreview'
import { NameHeader } from '../features/search/NameHeader'
import { useAppSearchProps } from './useAppSearchProps'

it.each([undefined, { status: 'pending' }, { status: 'verified' }])('carries API website verification and the configured report destination into name pages: %j', async verification => {
  const destination = 'https://github.com/HDauven/dusk-domains-frontend/issues/new?template=abuse-report.yml'
  const client = createDuskDomainsIndexerClient({ baseUrl: 'https://indexer.test', fetch: vi.fn(async () => new Response(JSON.stringify({
    ...analyzeName('google.dusk', DEFAULT_FEE_CONFIG), status: 'registered', verification,
  }))) })
  const indexed = await client.searchName('google.dusk')
  let page!: ReturnType<typeof useAppSearchProps>['searchProps']['result']
  function Probe() {
    const namePreview = useNamePreview({ apiSearchResult: indexed, query: 'google.dusk', duration: 1, renewalYears: 1,
      currentBlockHeight: 100, managedNameExpiresAt: 200, nowSeconds: 0, feeConfig: DEFAULT_FEE_CONFIG })
    const managedName = { node: namePreview.nodeHex, owner: 'owner', expiresAt: 200, graceEndsAt: 300 }
    page = useAppSearchProps({
      namePreview,
      appRuntime: { indexerClient: client, runtimeConfig: createDuskDomainsRuntimeConfig({ VITE_DUSK_DOMAINS_ABUSE_URL: destination }) },
      activityFeed: { activityEntries: [] }, domainRecordState: { parentResolverRecords: [] },
      domainState: { managedName }, economicsRuntime: { feeConfig: DEFAULT_FEE_CONFIG },
      mainViewRuntime: {}, registrationProps: { wizard: {} }, registrationState: {}, searchRuntime: {},
      searchState: { currentBlockHeight: 100, nowSeconds: 0 }, walletRuntime: { selectedAuthority: '' },
      derivedState: {}, management: { primaryProps: { primaryVerification: { verified: true } }, settingsProps: { managedName } },
    } as never).searchProps.result
    return <NameHeader {...page.headerProps} />
  }
  const html = renderToStaticMarkup(<Probe />)
  expect(html.includes('>Unverified</span>')).toBe(verification?.status !== 'verified')
  expect(page.abuseUrl).toBe(destination)
})
