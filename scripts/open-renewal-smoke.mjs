import assert from 'node:assert/strict'

export async function checkOpenRenewal(page) {
  const contract = 'aa'.repeat(32)
  const wallet = 'bb'.repeat(32)
  const marketplace = 'cc'.repeat(32)
  await page.route('**/on/contract:*/metadata', route => route.fulfill({
    json: { contract_owner: [contract, marketplace].some(id => route.request().url().includes(id)) ? '00'.repeat(32) : '' },
  }))
  await page.evaluate(async ({ contract, wallet, marketplace }) => {
    const { React, root } = window
    const { useDomainManagementAppState } = await import('/src/app/useDomainManagementAppState.ts')
    const { usePoolMarketplace } = await import('/src/app/usePoolMarketplace.ts')
    const { createDuskDomainsRuntimeConfig, createDuskDomainsOnChainReadTransport } = await import('/src/names/internal.ts')
    const { SearchResultPanel } = await import('/src/features/search/SearchResultPanel.tsx')
    const { deriveAppDerivedState } = await import('/src/app/derived/deriveAppDerivedState.ts')
    const { renewDomainName } = await import('/src/features/domains/renewDomainName.ts')
    const config = createDuskDomainsRuntimeConfig({ VITE_DUSK_DOMAINS_ENABLE_MARKETPLACE: 'false',
      VITE_DUSK_DOMAINS_ROUTER_CONTRACT_ID: `0x${'11'.repeat(32)}`,
      VITE_DUSK_DOMAINS_MARKETPLACE_CONTRACT_ID: `0x${marketplace}` })
    window.renewalMarketplaceUiEnabled = config.capabilities.marketplace
    const poolConfig = new Promise(resolve => { window.resolveRenewalPool = () => resolve({ marketplace: Array(32).fill(0xcc) }) })
    const read = createDuskDomainsOnChainReadTransport({ readContract: async ({ contract: target, functionName }) => {
      if (target !== config.contracts.router || functionName !== 'config') throw new Error('Expected router config read')
      return { output: await poolConfig, fnName: 'config' }
    } }, config.contracts)
    function Probe() {
      const [poolRead, setPoolRead] = React.useState(read)
      const marketplaceContractId = usePoolMarketplace(poolRead)
      const { managedName, setManagedName } = useDomainManagementAppState('resolver', null, null, location.origin, marketplaceContractId)
      React.useEffect(() => { setManagedName(current => ({ ...current, node: 'node', owner: `0x${contract}`, manager: `0x${contract}`, expiresAt: 200, graceEndsAt: 300 })) }, [setManagedName])
      const [connected, setConnected] = React.useState(true)
      const [resultView, setView] = React.useState('details')
      const selectedAuthority = connected ? 'payer' : ''
      const capabilities = deriveAppDerivedState({
        walletSigningReady: connected, selectedAddress: selectedAuthority, selectedAuthority,
        displayName: 'alice.dusk', nodeHex: 'node', managedName, currentBlockHeight: 250,
        nowSeconds: 1_790_000_000, subnameLabel: '', subnameManager: '', subnames: [],
        pendingReservations: [], primaryEndpointValue: '', recordDraftMutations: [], recordDraftErrors: [], confirmationInput: '',
      })
      window.switchRenewalOwner = () => setManagedName(current => ({ ...current, owner: `0x${wallet}`, manager: `0x${wallet}` }))
      window.escrowRenewalName = managerOnly => setManagedName(current => ({ ...current, owner: `0x${managerOnly ? contract : marketplace}`, manager: `0x${marketplace}` }))
      window.closeRenewalListing = () => setManagedName(current => ({ ...current, owner: `0x${contract}`, manager: `0x${contract}` }))
      window.canRenew = capabilities.canRenewName
      window.renewalOwnerIsContract = managedName.ownerIsContract
      window.renewalPoolId = marketplaceContractId
      window.failRenewalPool = () => setPoolRead({ read: async () => { throw new Error('offline') } })
      window.restoreRenewalPool = () => setPoolRead(read)
      window.deferRenewalPool = () => {
        const pending = new Promise(resolve => { window.resolveStaleRenewalPool = () => resolve({ marketplace: contract }) })
        setPoolRead({ read: () => pending })
      }
      window.disconnectRenewal = () => setConnected(false)
      window.renewalOwner = managedName.owner
      return React.createElement(SearchResultPanel, {
        headerProps: { status: 'registered', displayName: 'alice.dusk', records: [], viewerAuthority: selectedAuthority },
        settingsProps: { ...capabilities, managedName, displayName: 'alice.dusk', currentBlockHeight: 250,
          nowSeconds: 1_790_000_000, renewalYears: 1, minDurationYears: 1, maxDurationYears: 10,
          renewalFee: 10, renewalPreviewExpiresAt: 3_153_800,
          onRenewName: () => renewDomainName({ ...capabilities, managedName, displayName: 'alice.dusk', nodeHex: 'node',
            selectedAuthority, resultLabel: 'alice', renewalYears: 1, currentBlockHeight: 250, nowSeconds: 1_790_000_000,
            walletSetupState: 'connected', runtimeConfig: { contracts: {} }, setRenewalError: message => { window.renewalError = message },
            setManagedName, appendActivity: event => { window.renewalActivity = event },
            ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
            shouldApplyPreviewWriteFallback: async () => true,
            submitNameWrite: Object.assign(async (_name, call) => { window.renewalCall = call; return { status: 'executed', txId: 'paid' } }, { captureWorkspace: () => () => true }),
          }),
        },
        detailsProps: { displayName: 'alice.dusk', parentResolverRecords: [], activityEntries: [], subnames: [], primaryVerification: { tone: 'muted' } },
        subdomainsProps: { subnames: [] }, overviewProps: { canRegister: false }, nodeHex: 'node', resultView,
        onResultViewChange: setView,
      })
    }
    root.render(React.createElement(Probe))
  }, { contract, wallet, marketplace })
  await page.waitForFunction(() => window.renewalOwnerIsContract)
  assert.equal(await page.evaluate(() => window.renewalMarketplaceUiEnabled), false)
  assert.equal(await page.evaluate(() => window.canRenew), false)
  assert.equal(await page.getByRole('tab', { name: 'Renew', exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Renew', exact: true }).count(), 0)
  await page.evaluate(() => window.resolveRenewalPool())
  await page.getByRole('tab', { name: 'Renew', exact: true }).click()
  await page.getByText('Renewal adds time and does not change the owner.', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Transfer name', exact: true }).count(), 0)
  await page.getByRole('button', { name: 'Renew', exact: true }).click()
  await page.waitForFunction(() => window.renewalActivity)
  assert.deepEqual(await page.evaluate(() => window.renewalCall.args), { node: 'node', durationYears: 1, feeLux: 10_000_000_000 })
  assert.equal(await page.evaluate(() => window.renewalOwner), `0x${contract}`)
  assert.equal(await page.evaluate(() => window.renewalActivity.actor), 'payer')
  for (const managerOnly of [false, true]) {
    await page.evaluate(managerOnly => window.escrowRenewalName(managerOnly), managerOnly)
    await page.waitForFunction(() => window.renewalOwnerIsContract && !window.canRenew)
    await page.getByRole('tab', { name: 'Renew', exact: true }).waitFor({ state: 'detached' })
    assert.equal(await page.getByRole('button', { name: 'Renew', exact: true }).count(), 0)
    await page.evaluate(() => window.closeRenewalListing())
    await page.getByRole('tab', { name: 'Renew', exact: true }).click()
    assert.equal(await page.getByRole('button', { name: 'Renew', exact: true }).isEnabled(), true)
  }
  await page.evaluate(() => window.failRenewalPool())
  await page.waitForFunction(() => window.renewalPoolId === null && !window.canRenew)
  assert.equal(await page.getByRole('tab', { name: 'Renew', exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Renew', exact: true }).count(), 0)
  await page.evaluate(() => window.deferRenewalPool())
  await page.waitForFunction(() => Boolean(window.resolveStaleRenewalPool))
  await page.evaluate(() => window.restoreRenewalPool())
  await page.getByRole('tab', { name: 'Renew', exact: true }).click()
  await page.evaluate(() => window.resolveStaleRenewalPool())
  assert.equal(await page.evaluate(() => window.renewalPoolId), `0x${marketplace}`)
  assert.equal(await page.getByRole('button', { name: 'Renew', exact: true }).isEnabled(), true)
  await page.evaluate(() => window.switchRenewalOwner())
  await page.getByRole('tab', { name: 'Renew', exact: true }).waitFor({ state: 'detached' })
  assert.equal(await page.getByRole('button', { name: 'Renew', exact: true }).count(), 0)
  await page.evaluate(() => window.disconnectRenewal())
  await page.unroute('**/on/contract:*/metadata')
}
