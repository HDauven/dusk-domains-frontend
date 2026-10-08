import { reservation } from '../test/frozenFixtures'
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
import { RegistrationCompletionProgress } from '../features/registration/RegistrationCompletionProgress'
import { SearchWorkspace } from '../features/search/SearchWorkspace'
import { TransactionStatusNotice } from '../components/status/TransactionStatusNotice'

const noop = () => {}
afterEach(() => vi.unstubAllGlobals())
it('keeps network identification, a phone menu and referral access outside primary navigation', () => {
  const html = renderToStaticMarkup(<AppShell launchLinks={{support:null,abuse:null,security:null,status:null}}
    network={{label:'Local',tone:'local'}}
    runtimeNotice={null}
    skyNames={[]}
    navigation={{ mainView: "search", onMainViewChange: noop, onOpenName: noop, onSearchHome: noop, pendingReservationCount: 0, searching: false }}
    wallet={{ onOpenWallet: noop, walletState: {accounts:[]} as never, walletStatus: "disconnected" }}>Page</AppShell>)
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
  const card = renderToStaticMarkup(<SearchResultOverview {...{
    readOnly:true,
    canRegister:true,
    displayName:'example.dusk',
    resultStatus:'available',
    resultIssues:[],
    quote: { duration:1, registrationFee:10, feeConfigLoading:false },
    reservation: { savedReservation:null },
  } as unknown as ComponentProps<typeof SearchResultOverview>} />)
  expect(card).toContain('Example name')
  expect(card).toMatch(/<button[^>]*disabled=""[^>]*>Registration unavailable<\/button>/)
  expect(card).not.toContain('>Available<')
  // The name page's Night Card, above the panel, is the name's only picture.
  expect(card).not.toContain('name-portrait')
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
  const saved: PendingNameReservation = reservation({name:'alpha.dusk',controller:'0x'+'11'.repeat(32)})
  upsertPendingNameReservation(saved)
  let load!: ReturnType<typeof usePendingReservationList>['loadPendingReservations']
  function Probe({chainId,selectedAuthority}:{chainId:string;selectedAuthority:string}) { load=usePendingReservationList({chainId,selectedAuthority}).loadPendingReservations;return null }
  renderToStaticMarkup(<Probe chainId="dusk:0" selectedAuthority={saved.controller} />)
  expect(load()).toEqual([saved])
  const other = reservation({...saved,name:'beta.dusk',controller:'0x'+'22'.repeat(32)})
  upsertPendingNameReservation(other)
  renderToStaticMarkup(<Probe chainId="dusk:0" selectedAuthority={other.controller} />)
  expect(load()).toEqual([other])
  let rememberedOwner: string | null = other.controller
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
  renderToStaticMarkup(<Probe chainId="dusk:0" selectedAuthority={saved.controller} />)
  expect(load()).toEqual([])
  rememberedOwner = saved.controller
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
  const props = {wallet:{walletStatus:'locked',selectedAddress:''},currentBlockHeight:10,loading:false,myNames:[],myNamesError:'',pendingReservations:[saved],primarySummaries:{}} as unknown as MyDomainsViewProps
  const html = renderToStaticMarkup(<MyDomainsView {...props} />)
  expect(html).toContain('alpha.dusk')
  expect(html).toContain('Unlock your wallet to finish.')
  expect(html).toContain('Unlock wallet')
  expect(html).not.toContain('Connect wallet')
  expect(html).not.toContain('Refresh')
})
it('keeps a pending transaction reference behind Details and offers a confirmation read retry', () => {
  const state = {status:'executing',message:'Still confirming…',context:{title:'Register'},txId:'transaction-reference',retryConfirmation:noop} as const
  const html = renderToStaticMarkup(<TransactionStatusNotice state={state as never} />)
  expect(html).toContain('Still confirming…')
  expect(html).toMatch(/<details><summary>Details<\/summary>[\s\S]*transaction-reference/)
  expect(html).toContain('Retry confirmation')
  expect(html).not.toContain('Transaction timed out')
})

it('keeps search on home and result pages and removes it from name and claim pages', () => {
  const props = {
    result: {  },
    search: { checked:true, resultReady:false, query:'name', loading:false, onCheckAvailability:noop, onQueryChange:noop },
  } as unknown as ComponentProps<typeof SearchWorkspace>
  expect(renderToStaticMarkup(<SearchWorkspace {...props}
    search={{ ...props.search, checked: false }}
    result={{ ...props.result, resultView: "overview" }} />)).toContain('role="search"')
  expect(renderToStaticMarkup(<SearchWorkspace {...props}
    result={{ ...props.result, resultView: "overview" }} />)).toContain('role="search"')
  for (const view of ['details','register'] as const) expect(renderToStaticMarkup(<SearchWorkspace {...props}
    result={{ ...props.result, resultView: view }} />)).not.toContain('role="search"')
})
it('keeps slow registration feedback and its retry visible in the claim flow', () => {
  const progress = {status:'running',steps:[{id:'register',status:'executing',txId:'registration-reference'}]} as unknown as ComponentProps<typeof RegistrationCompletionProgress>['progress']
  const state = {status:'executing',message:'Still confirming…',txId:'registration-reference',retryConfirmation:noop} as const
  const html = renderToStaticMarkup(<RegistrationCompletionProgress progress={progress} txState={state as never} onSetAddress={noop} />)
  expect(html).toContain('Still confirming…')
  expect(html).toContain('registration-reference')
  expect(html).toContain('Retry confirmation')
})

it('keeps the app-level confirmation retry visible away from its name', () => {
  const pendingConfirmation = {name:'original.dusk',state:{status:'executing',message:'Still confirming…',context:{title:'Register'},txId:'original-transaction',retryConfirmation:noop}} as const
  const html = renderToStaticMarkup(<AppShell {...{navigation:{mainView:'treasury',pendingReservationCount:0},network:{label:'Local',tone:'local'},launchLinks:{},wallet:{walletState:{accounts:[]},walletStatus:'disconnected'},skyNames:[]} as unknown as ComponentProps<typeof AppShell>} pendingConfirmation={pendingConfirmation as never}>Another page</AppShell>)
  expect(html).toContain('aria-label="Pending transaction"')
  expect(html).toContain('original.dusk')
  expect(html).toContain('original-transaction')
  expect(html).toContain('Retry confirmation')
})
