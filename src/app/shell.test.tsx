import { forgetPendingReservation } from '../features/search/actions/forgetPendingReservation'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
import { NetworkStatus } from './NetworkStatus'
import { indexerFreshness, type IndexerHealth } from './networkFreshness'
import { MyDomainsView, type MyDomainsViewProps } from '../features/domains/MyDomainsView'
import { usePendingReservationList } from '../features/registration/usePendingReservationList'
import { createDuskDomainsRuntimeConfig, upsertPendingNameReservation, type PendingNameReservation } from '../names/internal'
import { SearchResultOverview } from '../features/search/SearchResultOverview'
import { SearchWorkspace } from '../features/search/SearchWorkspace'

const noop = () => {}
afterEach(() => vi.unstubAllGlobals())
it('keeps network identification, a phone menu and referral access outside primary navigation', () => {
  const html = renderToStaticMarkup(<AppShell mainView="search" launchLinks={{support:null,abuse:null,security:null,status:null}} network={{label:'Local',tone:'local'}} onMainViewChange={noop} onOpenName={noop} onOpenWallet={noop} onSearchHome={noop} pendingReservationCount={0} runtimeNotice={null} searching={false} skyNames={[]} walletState={{accounts:[]} as never} walletStatus="disconnected">Page</AppShell>)
  expect(html).toContain('network-badge local')
  expect(html).toContain('aria-label="Open menu"')
  const nav = html.match(/<nav[^>]*aria-label="Primary"[\s\S]*?<\/nav>/)![0]
  expect(nav).not.toContain('Referrals')
  expect(html.match(/<footer[\s\S]*?<\/footer>/)![0]).toContain('Referrals')
})
it('marks preview read-only, exposes configuration details and disables claiming', () => {
  const config = createDuskDomainsRuntimeConfig({})
  const html = renderToStaticMarkup(<NetworkStatus config={config} />)
  expect(html).toContain('Preview — read only.')
  expect(html).toContain('Availability and prices are examples')
  expect(html).toContain('<summary>Details</summary>')
  expect(html).toContain(config.missingLiveInputs[0])
  const card = renderToStaticMarkup(<SearchResultOverview {...{readOnly:true,canRegister:true,displayName:'example.dusk',duration:1,registrationFee:10,resultStatus:'available',resultIssues:[],savedReservation:null,feeConfigLoading:false} as unknown as ComponentProps<typeof SearchResultOverview>} />)
  expect(card).toContain('Example name')
  expect(card).toMatch(/<button[^>]*disabled=""[^>]*>Registration unavailable<\/button>/)
  expect(card).not.toContain('>Available<')
})
it('uses sync timestamps and lag, not the last name event, for freshness', () => {
  const now = Date.parse('2026-10-01T12:00:00Z')
  const health = {ok:true,lagBlocks:1,generatedAt:'2026-01-01T00:00:00Z',cursor:{updatedAt:'2026-10-01T11:59:50Z'}} as unknown as IndexerHealth
  expect(indexerFreshness(health,now)).toBeNull()
  expect(indexerFreshness(health,now+60_000)).toBeNull()
  expect(indexerFreshness(health,now+120_000)).toContain('Synced 2 min ago')
  expect(indexerFreshness({...health,lagBlocks:50},now)).toContain('catching up')
  expect(indexerFreshness({...health,ok:false},now)).toContain('catching up')
  expect(indexerFreshness(null,now)).toContain('unavailable')
})
it('scopes claim callbacks to the current remembered wallet and network', () => {
  const values = new Map<string,string>()
  vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)})
  const saved: PendingNameReservation = {name:'alpha.dusk',node:'node',controller:'owner',ownerAddress:'address',commitment:'commit',secret:'secret',chainId:'dusk:0',durationYears:1,committedBlockHeight:1,committedTxId:'tx',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}
  upsertPendingNameReservation(saved)
  let load!: ReturnType<typeof usePendingReservationList>['loadPendingReservations']
  function Probe({chainId,selectedAuthority}:{chainId:string;selectedAuthority:string}) { load=usePendingReservationList({chainId,selectedAuthority}).loadPendingReservations;return null }
  renderToStaticMarkup(<Probe chainId="dusk:0" selectedAuthority="owner" />)
  expect(load()).toEqual([saved])
  const other = {...saved,name:'beta.dusk',controller:'other',commitment:'other-commit',secret:'other-secret'}
  upsertPendingNameReservation(other)
  renderToStaticMarkup(<Probe chainId="dusk:0" selectedAuthority="other" />)
  expect(load()).toEqual([other])
  let rememberedOwner: string | null = 'other'
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => key === 'dusk-domains:last-claim-owner:dusk:0' ? rememberedOwner : null })
  values.set('dusk-domains:last-claim-owner:dusk:0', 'owner')
  renderToStaticMarkup(<Probe chainId="dusk:0" selectedAuthority="" />)
  expect(load()).toEqual([other])
  const confirm = vi.fn(() => true)
  vi.stubGlobal('confirm', confirm)
  forgetPendingReservation({loadPendingReservations: load} as never, saved)
  expect(confirm).not.toHaveBeenCalled()
  let ownerChanged = false
  confirm.mockImplementation(() => { ownerChanged = true; return true })
  forgetPendingReservation({ loadPendingReservations: () => ownerChanged ? [] : [other] } as never, other)
  expect(load()).toEqual([other])
  renderToStaticMarkup(<Probe chainId="dusk:0" selectedAuthority="owner" />)
  expect(load()).toEqual([])
  rememberedOwner = 'owner'
  expect(load()).toEqual([saved])
  rememberedOwner = null
  expect(load()).toEqual([])
  renderToStaticMarkup(<Probe chainId="dusk:2" selectedAuthority="" />)
  expect(load()).toEqual([])
  renderToStaticMarkup(<Probe chainId="dusk:0" selectedAuthority="unrelated" />)
  expect(load()).toEqual([])
})
it('shows saved claims and an unlock action while the wallet is locked, without manual refresh', () => {
  const saved = {name:'alpha.dusk',node:'node',controller:'owner',commitment:'commit',committedBlockHeight:1} as PendingNameReservation
  const props = {walletStatus:'locked',currentBlockHeight:10,loading:false,myNames:[],myNamesError:'',pendingReservations:[saved],primarySummaries:{},selectedAddress:''} as unknown as MyDomainsViewProps
  const html = renderToStaticMarkup(<MyDomainsView {...props} />)
  expect(html).toContain('alpha.dusk')
  expect(html).toContain('Unlock your wallet to finish.')
  expect(html).toContain('Unlock wallet')
  expect(html).not.toContain('Connect wallet')
  expect(html).not.toContain('Refresh')
})
it('keeps search on home and result pages and removes it from name and claim pages', () => {
  const props = {checked:true,resultReady:false,query:'name',loading:false,onCheckAvailability:noop,onQueryChange:noop} as unknown as ComponentProps<typeof SearchWorkspace>
  expect(renderToStaticMarkup(<SearchWorkspace {...props} checked={false} resultView="overview" />)).toContain('role="search"')
  expect(renderToStaticMarkup(<SearchWorkspace {...props} resultView="overview" />)).toContain('role="search"')
  for (const view of ['details','register'] as const) expect(renderToStaticMarkup(<SearchWorkspace {...props} resultView={view} />)).not.toContain('role="search"')
})
