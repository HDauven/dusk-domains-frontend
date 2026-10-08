import assert from 'node:assert/strict'

export async function checkPollingBudget(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { createHealthyIndexerClient } = await import('/src/app/indexerReadHelpers.ts')
    const { useOperatorPause } = await import('/src/app/useOperatorPause.ts')
    const { useIndexerFreshness } = await import('/src/app/useIndexerFreshness.ts')
    const { useAutoRefresh } = await import('/src/app/useAutoRefresh.ts')
    const { useMarketplaceData } = await import('/src/features/marketplace/useMarketplaceData.ts')
    const { useTreasuryAccount } = await import('/src/features/treasury/useTreasuryAccount.ts')
    const { useFeeConfig } = await import('/src/features/treasury/useFeeConfig.ts')
    const { useIndexedNameHydration } = await import('/src/features/search/useIndexedNameHydration.ts')
    const { useMyDomains } = await import('/src/features/domains/useMyDomains.ts')
    const { useReferralAccount } = await import('/src/features/referrals/useReferralAccount.ts')
    const { account } = await import('/src/test/frozenFixtures.ts')
    const { DEFAULT_FEE_CONFIG, contractPrincipalFromWalletAccount } = await import('/src/names/internal.ts')
    const { emptyTreasuryUiState } = await import('/src/features/treasury/treasuryState.ts')
    const { emptyReferralUiState } = await import('/src/features/referrals/referralState.ts')
    const { safeNamehashHex } = await import('/src/features/domains/domainFormat.ts')
    const node = safeNamehashHex('alpha.dusk')
    const realFetch = window.fetch
    const noop = () => {}
    const calls = []
    window.fetch = async (input, init) => {
      const url = new URL(String(input), location.origin)
      if (!url.pathname.startsWith('/poll-api/')) return realFetch(input, init)
      const path = url.pathname.slice('/poll-api/'.length)
      calls.push(path)
      let body
      switch (path) {
        case 'health': body = { ok: true, generatedAt: '', source: 'test', mode: 'snapshot', currentBlockHeight: 100, routes: [], names: 1 }; break
        case 'fee-config': body = { ...DEFAULT_FEE_CONFIG, updatedAt: 0, operator: null, updatedAtBlockHeight: null, lastEventType: null, txId: null, blockHeight: null }; break
        case 'names': body = { names: [], nextCursor: null }; break
        case 'search': body = { canonical: 'alpha.dusk', canonicalRaw: 'alpha.dusk', displayName: 'alpha.dusk', label: 'alpha', status: 'registered', price: 50, issues: [], transactionBlocked: false }; break
        case 'resolve': body = { canonicalName: 'alpha.dusk', node, records: [], resolver: { health: 'ok' }, expiry: { status: 'active' }, cache: {}, warnings: [], errors: [], verificationStatus: 'forward_resolved' }; break
        case 'name': body = { node, canonicalName: 'alpha.dusk', owner: 'owner', manager: null, resolverId: null, expiresAt: null, graceEndsAt: null, status: 'active', lastEventType: 'name_registered', records: [], primaryName: null, primaryStatus: 'no_address', subnameCount: 0, activityCount: 0 }; break
        case 'activity': body = { activity: [], nextCursor: null }; break
        case 'reverse': body = null; break
        case 'subnames': body = { subnames: [], nextCursor: null }; break
        case 'marketplace/config': body = { initialized: true, router: null, treasuryContract: null, marketplaceAuthority: null, operator: null, feeBps: 250, updatedAtBlockHeight: null, txId: null, blockHeight: null }; break
        case 'marketplace/refund': body = null; break
        case 'marketplace/fixed-sales': body = { fixedSales: [], nextCursor: null }; break
        case 'marketplace/auctions': body = { auctions: [], nextCursor: null }; break
        case 'marketplace/offers': body = { offers: [], nextCursor: null }; break
        case 'treasury': body = { ...emptyTreasuryUiState(), initialized: true, availableLux: 10 }; break
        case 'referrals': body = { ...emptyReferralUiState(url.searchParams.get('referrer')), supported: true }; break
        default: throw new Error(`Unexpected polling route ${path}`)
      }
      return Response.json(body)
    }
    const client = createHealthyIndexerClient('/poll-api')
    const actions = {
      activity: { startLoading: noop, finishLoading: noop, beginRead: () => () => true, hydrate: noop },
      domain: { beginRead: () => () => true, hydrate: noop }, records: { hydrate: noop },
      search: { startRead: noop, showResult: noop, updateClock: noop, fail: message => { window.pollReadError = message } },
    }
    function Probe({ view, connected }) {
      const selectedAddress = connected ? account : ''
      const selectedAuthority = connected ? contractPrincipalFromWalletAccount(account).principal : ''
      useOperatorPause(client, 'budget')
      useIndexerFreshness(client, false)
      useMarketplaceData({ indexerClient: client, accountScope: 'budget', mainView: view, selectedAddress, selectedAuthority, setError: noop })
      const treasury = useTreasuryAccount(client)
      const fee = useFeeConfig(client)
      const refreshTreasury = React.useCallback(() => Promise.all([treasury.loadTreasury(), fee.loadFeeConfig()]), [treasury.loadTreasury, fee.loadFeeConfig])
      useAutoRefresh(refreshTreasury, view === 'treasury')
      const name = useIndexedNameHydration({ ...actions, indexerClient: client, displayName: 'alpha.dusk', selectedAddress, recordSourceContractId: 'resolver' })
      useAutoRefresh(name.refreshCurrentNameFromIndexer, view === 'name')
      useMyDomains({ indexerClient: client, selectedAddress, selectedAuthority, shouldLoad: view === 'my-names', onBlockHeightChange: noop, onLoadPendingReservations: noop })
      const referral = useReferralAccount({ indexerClient: client, selectedReferralKey: connected ? `Contract:${'11'.repeat(32)}` : '' })
      useAutoRefresh(referral.loadReferralAccount, view === 'referrals')
      return React.createElement('output', { id: 'poll-view' }, `${view}:${connected}`)
    }
    window.pollCalls = calls
    window.renderPoll = (view, connected) => root.render(React.createElement(Probe, { key: `${view}:${connected}`, view, connected }))
    window.restorePoll = () => { window.fetch = realFetch; delete document.visibilityState }
  })
  const measurements = {}
  try {
    for (const connected of [false, true]) {
      for (const view of ['home', 'name', 'marketplace', 'treasury', 'my-names', 'referrals']) {
        await page.evaluate(({ view, connected }) => window.renderPoll(view, connected), { view, connected })
        await page.getByText(`${view}:${connected}`, { exact: true }).waitFor()
        // Exclude navigation/initial reads, then cover two full three-minute cycles.
        await page.clock.runFor(1_000)
        await page.evaluate(() => { window.pollCalls.length = 0 })
        await page.clock.runFor(360_000)
        const calls = await page.evaluate(() => [...window.pollCalls])
        const perMinute = calls.length / 6
        assert.ok(perMinute <= 6, `${view} exceeds six reads/minute: ${perMinute}`)
        assert.ok(calls.filter(path => path === 'health').length <= 8, 'Health must be shared')
        measurements[`${view}${connected ? ' (wallet)' : ''}`] = { requests: calls.length, perMinute }
        assert.equal(await page.evaluate(() => window.pollReadError || ''), '')
        await page.evaluate(() => {
          window.pollCalls.length = 0
          Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
          document.dispatchEvent(new Event('visibilitychange'))
        })
        await page.clock.runFor(60_000)
        assert.equal(await page.evaluate(() => window.pollCalls.length), 0, `${view} polls while hidden`)
        await page.evaluate(() => {
          delete document.visibilityState
          document.dispatchEvent(new Event('visibilitychange'))
        })
        await page.clock.runFor(10)
        assert.equal(await page.evaluate(() => window.pollCalls.filter(path => path === 'health').length), 1, `${view} must resume with one health read`)

      }
    }
    await page.evaluate(() => {
      window.pollCalls.length = 0
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.clock.runFor(360_000)
    assert.equal(await page.evaluate(() => window.pollCalls.length), 0, 'Hidden tabs make no background reads')
    console.log(`Idle requests over six minutes: ${JSON.stringify(measurements)}`)
  } finally {
    await page.evaluate(() => { window.root.render(null); window.restorePoll() })
  }
}
