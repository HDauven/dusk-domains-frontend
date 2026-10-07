import assert from 'node:assert/strict'

export async function checkRefreshOrdering(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { useFeeConfig } = await import('/src/features/treasury/useFeeConfig.ts')
    const { useTreasuryAccount } = await import('/src/features/treasury/useTreasuryAccount.ts')
    const { useReferralAccount } = await import('/src/features/referrals/useReferralAccount.ts')
    const { useIndexerFreshness } = await import('/src/app/useIndexerFreshness.ts')
    const { useAutoRefresh } = await import('/src/app/useAutoRefresh.ts')
    window.requests = { fee: [], treasury: [], referral: [], health: [] }
    const read = kind => new Promise((resolve, reject) => window.requests[kind].push({ resolve, reject }))
    const client = { getHealth: () => read('health'), getFeeConfig: () => read('fee'), getTreasury: () => read('treasury'), getReferralState: () => read('referral') }
    function Readers() {
      const freshness = useIndexerFreshness(client, false)
      window.readerFreshness = freshness
      const fee = useFeeConfig(client)
      const treasury = useTreasuryAccount(client)
      const [owner, setOwner] = React.useState('owner')
      window.setReaderOwner = setOwner
      const referral = useReferralAccount({ indexerClient: client, selectedReferralKey: owner })
      window.readerOwner = owner
      window.loadData = options => Promise.all([fee.loadFeeConfig(options), treasury.loadTreasury(options), referral.loadReferralAccount(options)])
      window.readerState = { fee, treasury, referral }
      useAutoRefresh(window.loadData)
      return React.createElement('output', { id: 'readers' }, `${fee.feeConfig.version}:${treasury.treasuryState.availableLux}:${referral.referralAccountState.claimableLux}`)
    }
    root.render(React.createElement(Readers))
  })
  await page.waitForFunction(() => window.requests.fee.length === 1)
  await page.evaluate(() => {
    void window.loadData() // Navigation
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.runFor(30_000)
  assert.deepEqual(await page.evaluate(() => ['fee', 'treasury', 'referral', 'health'].map(key => window.requests[key].length)), [1, 1, 1, 1], 'Navigation, focus, visibility and interval share pending reads')
  await page.evaluate(() => {
    window.dispatchEvent(new Event('dusk-domains:write-confirmed'))
    window.dispatchEvent(new Event('dusk-domains:write-confirmed'))
    void window.loadData() // Explicit post-write loader joins the trailing refresh.
  })
  assert.deepEqual(await page.evaluate(() => ['fee', 'treasury', 'referral', 'health'].map(key => window.requests[key].length)), [1, 1, 1, 1], 'Writes queue without overlapping a pending read')
  for (const version of [2, 3]) {
    await page.evaluate(async version => {
      const { DEFAULT_FEE_CONFIG } = await import('/src/names/internal.ts')
      window.requests.health.at(-1).resolve({ok:true,lagBlocks:0,cursor:{updatedAt:new Date().toISOString()}})
      window.requests.fee.at(-1).resolve({ ...DEFAULT_FEE_CONFIG, version })
      window.requests.treasury.at(-1).resolve({ availableLux: version })
      window.requests.referral.at(-1).resolve({ claimableLux: version })
    }, version)
    if (version === 2) await page.waitForFunction(() => window.requests.treasury.length === 2)
  }
  await page.waitForFunction(() => document.querySelector('#readers')?.textContent === '3:3:3')
  assert.deepEqual(await page.evaluate(() => ['fee', 'treasury', 'referral', 'health'].map(key => window.requests[key].length)), [2, 2, 2, 2], 'Only one trailing read runs')
  assert.equal(await page.evaluate(() => window.readerFreshness), null)
  assert.deepEqual(await page.evaluate(() => [window.readerState.fee.feeConfigError, window.readerState.treasury.treasuryError, window.readerState.referral.referralError]), ['', '', ''])
  assert.deepEqual(await page.evaluate(() => [window.readerState.fee.feeConfigLoading, window.readerState.treasury.treasuryLoading, window.readerState.referral.referralLoading]), [false, false, false])
  await page.evaluate(() => { void window.readerState.referral.loadReferralAccount() })
  await page.waitForFunction(() => window.requests.referral.length === 3)
  await page.evaluate(() => window.setReaderOwner('next-owner'))
  await page.waitForFunction(() => window.readerOwner === 'next-owner')
  await page.evaluate(() => {
    void window.readerState.referral.loadReferralAccount()
    window.requests.referral[2].resolve({ claimableLux: 99 })
  })
  await page.waitForFunction(() => window.requests.referral.length === 4)
  assert.equal(await page.locator('#readers').textContent(), '3:3:3', 'An old owner response is discarded before the trailing read starts')
  await page.evaluate(() => window.requests.referral[3].resolve({ claimableLux: 7 }))
  await page.waitForFunction(() => document.querySelector('#readers')?.textContent === '3:3:7')
}

export async function checkLockedClaims(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { createDuskWallet, upsertPendingNameReservation } = await import('/src/names/internal.ts')
    const { createWalletSession } = await import('/src/features/wallet/walletSession.ts')
    const { deriveWalletSessionModel } = await import('/src/features/wallet/walletStatus.ts')
    const { usePendingReservationList } = await import('/src/features/registration/usePendingReservationList.ts')
    localStorage.clear()
    sessionStorage.clear()
    const { reservation } = await import('/src/test/frozenFixtures.ts')
    for (const controller of [('0x' + '11'.repeat(32)), ('0x' + '22'.repeat(32))]) upsertPendingNameReservation(reservation({name:controller === ('0x' + '11'.repeat(32)) ? 'alpha.dusk' : 'beta.dusk',controller,ownerAddress:controller}))
    const listeners = new Map()
    window.profileReads = []
    window.delayClaimReads = false
    const provider = {
      isDusk: true, isAuthorized: true, chainId: 'dusk:0', profiles: [{ account: ('0x' + '11'.repeat(32)), profileId: 'primary' }],
      on(event, callback) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(callback) },
      off(event, callback) { listeners.get(event)?.delete(callback) },
      async request({ method }) {
        if (method === 'dusk_profiles') return window.delayClaimReads ? new Promise(resolve => window.profileReads.push(resolve)) : this.profiles
        if (method === 'dusk_chainId') return this.chainId
        if (method === 'dusk_disconnect') throw new Error('Revocation unavailable')
        return null
      },
    }
    window.claimSession = createWalletSession(createDuskWallet({ provider, autoRefresh: false, rememberLastUsedProvider: false }))
    window.selectClaimOwner = owner => {
      provider.profiles = owner ? [{ account: owner, profileId: 'primary' }] : []
      listeners.get(owner ? 'profilesChanged' : 'lock').forEach(callback => callback(provider.profiles))
    }
    window.seenClaimOwners = []
    function Claims() {
      const [state, setState] = React.useState(window.claimSession.state)
      React.useEffect(() => window.claimSession.subscribe(setState), [])
      const selectedAuthority = deriveWalletSessionModel(state, true).selectedAddress
      window.seenClaimOwners.push(selectedAuthority)
      const claims = usePendingReservationList({ chainId: 'dusk:0', selectedAuthority, explicitlyDisconnected: state.explicitlyDisconnected })
      window.currentClaims = claims
      if (selectedAuthority === ('0x' + '11'.repeat(32))) window.loadOldClaims = claims.loadPendingReservations
      return React.createElement('output', { id: 'claims' }, claims.pendingReservations.map(claim => claim.name).join(','))
    }
    await window.claimSession.ready()
    await window.claimSession.refresh()
    root.render(React.createElement(Claims))
  })
  await page.waitForFunction(() => document.querySelector('#claims')?.textContent === 'alpha.dusk')
  assert.equal(await page.evaluate(() => sessionStorage.getItem('dusk-domains:last-claim-owner:dusk:0')), ('0x' + '11'.repeat(32)))
  await page.evaluate(() => { window.delayClaimReads = true; void window.claimSession.refresh() })
  await page.waitForFunction(() => window.profileReads.length === 1)
  assert.deepEqual(await page.evaluate(async () => {
    const { forgetPendingReservation } = await import('/src/features/search/actions/forgetPendingReservation.ts')
    const { listPendingNameReservations } = await import('/src/names/internal.ts')
    const a = listPendingNameReservations({ chainId: 'dusk:0', controller: ('0x' + '11'.repeat(32)) })[0]
    window.seenClaimOwners = []
    window.selectClaimOwner(('0x' + '22'.repeat(32)))
    window.selectClaimOwner('')
    let prompted = false
    window.confirm = () => { prompted = true; return true }
    forgetPendingReservation({ loadPendingReservations: window.loadOldClaims }, a)
    return [prompted, listPendingNameReservations({ chainId: 'dusk:0', controller: ('0x' + '11'.repeat(32)) })[0]?.secret]
  }), [false, ('0x' + '33'.repeat(32))], 'Forget cannot reach the previous owner before React rerenders')
  const checkLocked = async () => {
    await page.waitForTimeout(50)
    assert.equal(await page.locator('#claims').textContent(), '', 'A delayed refresh followed by B locking exposes no claims')
    assert.equal(await page.evaluate(() => sessionStorage.getItem('dusk-domains:last-claim-owner:dusk:0')), null)
    assert.deepEqual(await page.evaluate(async () => {
      const { forgetPendingReservation } = await import('/src/features/search/actions/forgetPendingReservation.ts')
      const { listPendingNameReservations } = await import('/src/names/internal.ts')
      const a = listPendingNameReservations({ chainId: 'dusk:0', controller: ('0x' + '11'.repeat(32)) })[0]
      let prompted = false
      window.confirm = () => { prompted = true; return true }
      forgetPendingReservation({ loadPendingReservations: window.loadOldClaims }, a)
      return [prompted, listPendingNameReservations({ chainId: 'dusk:0', controller: ('0x' + '11'.repeat(32)) })[0]?.secret]
    }), [false, ('0x' + '33'.repeat(32))], 'Forget cannot reach A through a callback captured before the switch')
  }
  await checkLocked()
  await page.evaluate(() => window.profileReads[0]([{ account: ('0x' + '11'.repeat(32)), profileId: 'primary' }]))
  await page.waitForFunction(() => window.profileReads.length === 2)
  await checkLocked()
  await page.evaluate(async () => { window.profileReads[1]([]); await window.claimSession.refresh() })
  await checkLocked()
  assert.equal(await page.evaluate(() => window.seenClaimOwners.includes(('0x' + '11'.repeat(32)))), false, 'The regression does not depend on stale profiles being published')
  await page.evaluate(async () => { window.delayClaimReads = false; window.selectClaimOwner(('0x' + '22'.repeat(32))); await window.claimSession.refresh() })
  await page.waitForFunction(() => document.querySelector('#claims')?.textContent === 'beta.dusk')
  assert.equal(await page.evaluate(() => sessionStorage.getItem('dusk-domains:last-claim-owner:dusk:0')), ('0x' + '22'.repeat(32)), 'Only a stable session restores the remembered owner')
  const otherTab = await page.context().newPage()
  try {
    await otherTab.route('**/src/main.tsx', route => route.fulfill({ contentType: 'text/javascript', body: '' }))
    await otherTab.goto(page.url())
    await otherTab.evaluate(() => {
      localStorage.setItem('dusk-domains:last-claim-owner:dusk:0', ('0x' + '11'.repeat(32)))
      sessionStorage.setItem('dusk-domains:last-claim-owner:dusk:0', ('0x' + '11'.repeat(32)))
    })
    assert.equal(await page.evaluate(() => sessionStorage.getItem('dusk-domains:last-claim-owner:dusk:0')), ('0x' + '22'.repeat(32)), 'Other tabs cannot change the claim owner')
  } finally { await otherTab.close() }
  assert.deepEqual(await page.evaluate(async () => {
    const { forgetPendingReservation } = await import('/src/features/search/actions/forgetPendingReservation.ts')
    const { listPendingNameReservations } = await import('/src/names/internal.ts')
    const all = () => [('0x' + '11'.repeat(32)), ('0x' + '22'.repeat(32))].flatMap(controller => listPendingNameReservations({ chainId: 'dusk:0', controller }))
    window.confirm = () => true
    forgetPendingReservation({ loadPendingReservations: window.loadOldClaims }, all().find(claim => claim.controller === ('0x' + '11'.repeat(32))))
    const before = all().map(claim => claim.name).sort()
    forgetPendingReservation({ loadPendingReservations: window.currentClaims.loadPendingReservations }, window.currentClaims.pendingReservations[0])
    return [before, all().map(claim => claim.name)]
  }), [['alpha.dusk', 'beta.dusk'], ['alpha.dusk']], 'Forget preserves the other account secret while deleting B’s own claim')
  await page.evaluate(async () => { await window.claimSession.disconnect().catch(() => {}); await window.claimSession.refresh() })
  await checkLocked()
  await page.evaluate(() => window.claimSession.destroy())
  console.log('PASS: claim owners clear across delayed account switches, locks and explicit disconnects; Forget preserves other accounts')
}
