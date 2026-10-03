// @vitest-environment happy-dom
import { act, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useReferralControls } from './useReferralControls'
import { initialReferralInput, readStoredReferralInput } from './referralState'
import { useUrlRoute } from '../../app/useUrlRoute'
import type { AppMainView } from '../../app/AppTypes'
import { createCompleteRegistrationRequest } from '../registration/completeRegistrationCall'
import { analyzeName, DEFAULT_FEE_CONFIG } from '../../names/internal'

const referrer = `contract:0x${'09'.repeat(32)}`
const newer = `contract:0x${'08'.repeat(32)}`
const account = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'
let root: Root
let controls: ReturnType<typeof useReferralControls>
let goHome: () => void
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  sessionStorage.clear()
  localStorage.clear()
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root')!)
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals() })

function App() {
  const referralControls = useReferralControls({ selectedAddress: '', setReferralError: () => {} })
  const [mainView, setMainView] = useState<AppMainView>('search')
  const [name, setName] = useState('')
  useEffect(() => {
    controls = referralControls
    goHome = () => { setName(''); setMainView('search') }
  })
  useUrlRoute({ checked: Boolean(name), searchedName: name || null, mainView,
    onOpenName: name => { setName(name); setMainView('search') },
    onOpenView: view => { setName(''); setMainView(view) } })
  return <output>{referralControls.referralState.valid ? referralControls.referralState.input : ''}</output>
}
async function land(path: string) {
  window.history.replaceState(null, '', path)
  await act(async () => root.render(<App />))
}
async function arrive(path: string) {
  await act(async () => {
    window.history.pushState(null, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
}

it.each(['/name/x.dusk', '/my', '/market', '/market/sell/aurora.dusk', '/referrals', '/treasury'])('captures a referral once from %s and applies it when registering from home', async path => {
  await land(`${path}?ref=${encodeURIComponent(referrer)}`)
  expect(controls.referralState.valid).toBe(true)
  expect(window.location.search).toBe('')
  expect(readStoredReferralInput()).toBe(referrer)
  expect(localStorage.length).toBe(0)
  await act(async () => goHome())
  expect(window.location.pathname).toBe('/')
  expect(window.location.search).toBe('')
  const request = createCompleteRegistrationRequest({
    appliedReferral: controls.referralState,
    displayName: 'aurora.dusk', duration: 1, feeConfig: DEFAULT_FEE_CONFIG, lifecycleBaseBlockHeight: 100,
    preparedCommit: { commitment: `0x${'01'.repeat(32)}`, secret: `0x${'02'.repeat(32)}`, committedBlockHeight: 90, committedTxId: 'tx' },
    registerSetsPrimary: true, registrationTargetAddress: account, result: analyzeName('aurora.dusk'),
  })
  expect(request.call.args).toMatchObject({ referrer: { kind: 'Contract', bytes: Array(32).fill(9) } })
  await act(async () => root.render(null))
  await act(async () => root.render(<App />))
  expect(controls.referralState.input).toBe(referrer)
  expect(controls.referralState.valid).toBe(true)
  sessionStorage.clear()
  expect(initialReferralInput()).toBe('')
})

it('replaces attribution from a newer route, preserves other parameters, and clears invalid or empty replacements', async () => {
  await land(`/name/x.dusk?ref=${encodeURIComponent(referrer)}&network=local#profile`)
  expect(window.location.search).toBe('?network=local')
  expect(window.location.hash).toBe('#profile')
  await arrive(`/market?ref=${encodeURIComponent(newer)}`)
  expect(controls.referralState.input).toBe(newer)
  expect(readStoredReferralInput()).toBe(newer)
  await arrive(`/my?ref=${encodeURIComponent(newer)}`)
  expect(readStoredReferralInput()).toBe(newer)
  await arrive('/name/y.dusk?ref=invalid')
  expect(controls.referralState.valid).toBe(false)
  expect(readStoredReferralInput()).toBe('')
  await arrive(`/?ref=${encodeURIComponent(referrer)}`)
  await arrive('/my?ref=')
  expect(controls.referralState.input).toBe('')
  expect(readStoredReferralInput()).toBe('')
})
