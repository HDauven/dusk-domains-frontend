// @vitest-environment happy-dom
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { SearchResultPanelProps } from './SearchResultPanel'
import { SearchWorkspace } from './SearchWorkspace'
import { downloadNameCard } from '../registration/shareNameCard'
import { useAppSearchProps } from '../../app/useAppSearchProps'
import { DEFAULT_FEE_CONFIG } from '../../names/internal'
import { useReferralControls } from '../referrals/useReferralControls'
import { readStoredReferralInput } from '../referrals/referralState'

vi.mock('../registration/shareNameCard', () => ({ downloadNameCard: vi.fn().mockResolvedValue(undefined) }))

let root: Root
const writeText = vi.fn().mockResolvedValue(undefined)
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  Object.defineProperty(document, 'fonts', { configurable: true, value: Object.assign(new EventTarget(), { ready: Promise.resolve() }) })
  document.head.innerHTML = '<meta property="og:image" content="old"><meta property="og:image" content="duplicate">'
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root')!)
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function page(name: string, referralAddress = '', description = '') {
  const props = {
    referralAddress,
    headerProps: { status: 'registered', displayName: name, records: description ? [{ key: 'text.description', value: description, visibility: 'public' }] : [], viewerAuthority: '' },
    settingsProps: { managedName: { node: 'node', owner: 'owner', manager: 'manager' } },
    detailsProps: { displayName: name, parentResolverRecords: [], activityEntries: [], subnames: [], primaryVerification: { tone: 'muted' } },
    subdomainsProps: { subnames: [] }, overviewProps: { canRegister: false }, nodeHex: 'node', resultView: 'details',
  } as unknown as SearchResultPanelProps
  return <SearchWorkspace {...props} checked resultReady loading={false} query={name} onCheckAvailability={() => {}} onQueryChange={() => {}} />
}

const walletAddress = `contract:0x${'09'.repeat(32)}`
const incomingReferral = `contract:0x${'08'.repeat(32)}`
type WalletSetupState = Parameters<typeof useAppSearchProps>[0]['walletRuntime']['walletSetupState']

function AppNamePage({ selectedAddress = walletAddress, walletSetupState = 'connected', referralAttribution = true }: {
  selectedAddress?: string
  walletSetupState?: WalletSetupState
  referralAttribution?: boolean
}) {
  const { referralState } = useReferralControls({ selectedAddress, setReferralError: () => {} })
  const managedName = { node: 'node', owner: 'owner', manager: 'manager' }
  const { searchProps } = useAppSearchProps({
    appRuntime: { runtimeConfig: { capabilities: { referralAttribution } } },
    walletRuntime: { selectedAddress, selectedAuthority: 'owner', walletSetupState },
    economicsRuntime: { feeConfig: DEFAULT_FEE_CONFIG, activeReferral: referralState, appliedReferral: referralState, referralsProps: { referralState } },
    activityFeed: { activityEntries: [], recentWarnings: [] },
    domainRecordState: { parentResolverRecords: [] },
    domainState: { managedName, subnames: [] },
    derivedState: { primaryVerification: { tone: 'muted' } },
    namePreview: { displayName: 'aurora.dusk', nodeHex: 'node', result: { status: 'registered', issues: [] } },
    searchState: { checked: true, query: 'aurora.dusk', resultView: 'details' },
    searchRuntime: {}, mainViewRuntime: {}, registrationState: { duration: 1 },
    registrationProps: { wizard: {} }, primaryProps: { primaryVerification: {} },
    settingsProps: { managedName }, subdomainsProps: { subnames: [] },
  } as unknown as Parameters<typeof useAppSearchProps>[0])
  return <SearchWorkspace {...searchProps} />
}
async function render(content: ReactNode) { await act(async () => root.render(content)) }
async function click(label: string) {
  const button = [...document.querySelectorAll('button')].find(button => button.textContent === label)
  expect(button, `Missing ${label} control`).toBeTruthy()
  await act(async () => button!.click())
}
const meta = (key: string) => document.head.querySelector<HTMLMetaElement>(`meta[${key.startsWith('og:') ? 'property' : 'name'}="${key}"]`)?.content
const canonical = () => document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href

it('updates browser metadata on name navigation and clears it when leaving the page', async () => {
  await render(page('aurora.dusk', '', 'A <sunset> & stars'))
  expect(document.title).toBe('aurora.dusk · Dusk Domains')
  expect(meta('description')).toBe('A <sunset> & stars')
  expect(meta('og:description')).toBe(meta('description'))
  expect(meta('twitter:description')).toBe(meta('description'))
  expect(meta('twitter:card')).toBe('summary_large_image')
  expect(meta('og:image')).toBe('https://dusk.domains/api/share/name/aurora.dusk.png')
  expect(meta('twitter:image')).toBe(meta('og:image'))
  expect(document.querySelectorAll('meta[property="og:image"]')).toHaveLength(1)
  expect(canonical()).toBe('https://dusk.domains/name/aurora.dusk')
  expect(meta('og:url')).toBe(canonical())
  expect(document.querySelector('sunset')).toBeNull()
  await render(page('sunset.dusk'))
  expect(document.title).toBe('sunset.dusk · Dusk Domains')
  expect(meta('og:title')).toBe(document.title)
  expect(meta('twitter:title')).toBe(document.title)
  expect(meta('description')).toMatch(/^Search, register and manage/)
  expect(canonical()).toBe('https://dusk.domains/name/sunset.dusk')
  await render(<main>Home</main>)
  expect(document.title).toBe('Dusk Domains | .dusk domains for Dusk')
  expect(canonical()).toBe('https://dusk.domains/')
  expect(meta('og:image')).toBe('https://dusk.domains/og-image.png')
  expect(document.head.innerHTML).not.toContain('sunset.dusk')
})

it.each(['', `contract:0x${'09'.repeat(32)}`, 'not-a-referrer'])('copies the name link with only a claimable referral: %s', async (referralAddress) => {
  await render(page('aurora.dusk', referralAddress))
  await click('Share')
  const link = new URL('https://dusk.domains/name/aurora.dusk')
  if (referralAddress.startsWith('contract:')) link.searchParams.set('ref', referralAddress)
  expect(writeText).toHaveBeenCalledExactlyOnceWith(link.href)
  expect(document.querySelector('[role="status"]')?.textContent).toBe('Copied')
  expect(canonical()).toBe('https://dusk.domains/name/aurora.dusk')
})

it('shares the selected wallet through app wiring instead of incoming attribution, and follows wallet changes', async () => {
  window.history.replaceState(null, '', `/name/aurora.dusk?ref=${encodeURIComponent(incomingReferral)}`)
  await render(<AppNamePage />)
  expect(readStoredReferralInput()).toBe(incomingReferral)
  expect(window.location.search).toBe('')
  await click('Share')
  const link = new URL('https://dusk.domains/name/aurora.dusk')
  link.searchParams.set('ref', walletAddress)
  expect(writeText).toHaveBeenLastCalledWith(link.href)
  const nextWallet = `contract:0x${'07'.repeat(32)}`
  await render(<AppNamePage selectedAddress={nextWallet} />)
  await click('Share')
  link.searchParams.set('ref', nextWallet)
  expect(writeText).toHaveBeenLastCalledWith(link.href)
  await render(<AppNamePage selectedAddress={nextWallet} walletSetupState="disconnected" />)
  await click('Share')
  expect(writeText).toHaveBeenLastCalledWith('https://dusk.domains/name/aurora.dusk')
  expect(readStoredReferralInput()).toBe(incomingReferral)
  expect(canonical()).toBe('https://dusk.domains/name/aurora.dusk')
})

it.each([
  { walletSetupState: 'disconnected', referralAttribution: true },
  { walletSetupState: 'locked', referralAttribution: true },
  { walletSetupState: 'wrong-network', referralAttribution: true },
  { walletSetupState: 'connected', referralAttribution: false },
] as const)('gates shared referrals in the app with a retained wallet address: %j', async props => {
  window.history.replaceState(null, '', `/name/aurora.dusk?ref=${encodeURIComponent(incomingReferral)}`)
  await render(<AppNamePage {...props} />)
  expect(readStoredReferralInput()).toBe(incomingReferral)
  await click('Share')
  expect(writeText).toHaveBeenCalledExactlyOnceWith('https://dusk.domains/name/aurora.dusk')
})

it('drops the old wallet referral on disconnect and offers the existing card download', async () => {
  await render(page('aurora.dusk', `contract:0x${'09'.repeat(32)}`))
  await click('Share')
  await render(page('aurora.dusk'))
  await click('Share')
  expect(writeText).toHaveBeenLastCalledWith('https://dusk.domains/name/aurora.dusk')
  await click('Download card')
  expect(downloadNameCard).toHaveBeenCalledExactlyOnceWith('aurora.dusk')
})

it('offers a selectable link if the browser clipboard is unavailable', async () => {
  vi.stubGlobal('navigator', {})
  await render(page('aurora.dusk'))
  await click('Share')
  expect(document.querySelector('.name-share a')?.getAttribute('href')).toBe('https://dusk.domains/name/aurora.dusk')
})
