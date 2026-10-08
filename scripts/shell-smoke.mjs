import assert from 'node:assert/strict'

export async function checkAppShell(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { AppShell } = await import('/src/app/AppShell.tsx')
    const { useAutoRefresh } = await import('/src/app/useAutoRefresh.ts')
    const el = React.createElement
    window.shellRefreshes = 0
    function Shell() {
      const [mainView, setMainView] = React.useState('my-names')
      useAutoRefresh(() => { window.shellRefreshes++ })
      return el(AppShell, {
        network:{label:'Local',tone:'local'},
        launchLinks:{},
        runtimeNotice:null,
        skyNames:[],
        navigation: {
          mainView,
          onMainViewChange:setMainView,
          onOpenName:()=>{},
          onSearchHome:()=>setMainView('search'),
          pendingReservationCount:1,
          searching:false,
        },
        wallet: {
          onOpenWallet:()=>{},
          walletState:{accounts:[]},
          walletStatus:'locked',
        },
      },el('h1',null,mainView))
    }
    root.render(el(Shell))
  })
  await page.getByRole('heading', { name: 'my-names' }).waitFor()
  await page.setViewportSize({ width: 1440, height: 900 })
  assert.equal(await page.getByRole('button', { name: 'Open menu' }).isVisible(), false, 'Menu toggle is phone-only')
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 844 })
    assert.equal(await page.getByRole('navigation', { name: 'Primary' }).isVisible(), false)
    const header = await page.locator('.topbar').boundingBox()
    assert.ok(header.height < 85, 'Phone header fits on one row')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.getByRole('button', { name: 'Open menu' }).focus()
    await page.keyboard.press('Enter')
    await page.getByRole('navigation', { name: 'Primary' }).waitFor()
    const links = page.getByRole('navigation', { name: 'Primary' }).getByRole('link')
    assert.equal(await links.first().evaluate(element => element === document.activeElement), true, 'Opening the phone menu focuses its first link')
    await page.keyboard.press('Shift+Tab')
    assert.equal(await page.getByRole('button', { name: 'Close menu' }).evaluate(element => element === document.activeElement), true)
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    assert.equal(await links.nth(1).evaluate(element => element === document.activeElement), true)
    await page.keyboard.press('Escape')
    assert.equal(await page.getByRole('button', { name: 'Open menu' }).evaluate(element => element === document.activeElement), true, 'Escape returns focus to the menu toggle')
    assert.equal(await page.getByRole('navigation', { name: 'Primary' }).isVisible(), false)
  }
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.setViewportSize({ width: 901, height: 900 })
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: /My names/ }).focus()
  await page.keyboard.press('Tab')
  assert.ok(await page.locator('.wallet-connect').evaluate(element => element === document.activeElement), 'Desktop navigation releases the phone focus trap')
  // The breakpoint listener closes the menu on its next render; wait for it rather than racing it.
  await page.waitForFunction(() => document.querySelector('.menu-toggle')?.getAttribute('aria-expanded') === 'false', null, { timeout: 5_000 })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.getByRole('navigation', { name: 'Primary' }).isVisible(), false, 'Returning to phone keeps the menu closed')
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Market' }).click()
  await page.getByRole('heading', { name: 'marketplace' }).waitFor()
  assert.equal(await page.getByRole('navigation', { name: 'Primary' }).isVisible(), false)
  const before = await page.evaluate(() => window.shellRefreshes)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await page.waitForFunction(count => window.shellRefreshes > count, before)
  await page.evaluate(() => window.dispatchEvent(new Event('dusk-domains:write-confirmed')))
  await page.waitForFunction(count => window.shellRefreshes > count + 1, before)
  await page.clock.runFor(180_000)
  await page.waitForFunction(count => window.shellRefreshes > count + 2, before)

  await page.evaluate(async () => {
    const { React, root } = window
    const { useDuskWalletSession } = await import('/src/features/wallet/useDuskWalletSession.ts')
    const { AppShell } = await import('/src/app/AppShell.tsx')
    const { walletConnectionStatus } = await import('/src/features/wallet/walletStatus.ts')
    const state = { accounts:[],profiles:[],availableProviders:[],installed:true,authorized:false,selectedAddress:null,chainId:'dusk:0' }
    window.walletRequests = 0
    const wallet = {state,ready:async()=>{},refresh:async()=>{},discoverProviders:async()=>{},connect:()=>{
        window.walletRequests++
        return new Promise((resolve,reject) => { window.rejectWallet = () => reject(new Error('User rejected the request')); window.approveWallet = () => {
            state.authorized=true;state.selectedAddress='ocXXBAafr7abcdefghijklmnopqrstuvwxyzBRM4eF';state.accounts=[state.selectedAddress];state.profiles=[{account:state.selectedAddress}];state.selectedProfile=state.profiles[0];resolve(state.profiles)
          } })
      }}
    function Wallet() {
      const [open,setOpen] = React.useState(false)
      const kit = React.useMemo(()=>({wallet,open:()=>setOpen(true),close:()=>setOpen(false),subscribe:()=>()=>{},destroy:()=>{}}),[])
      const session = useDuskWalletSession(kit, {}, 'dusk:0')
      return React.createElement(AppShell, {
        network:{label:'Local',tone:'local'},
        launchLinks:{},
        runtimeNotice:null,
        skyNames:[],
        navigation: {
          mainView:'search',
          onMainViewChange:()=>{},
          onOpenName:()=>{},
          onSearchHome:()=>{},
          pendingReservationCount:0,
          searching:false,
        },
        wallet: {
          onOpenWallet:session.handleOpenWalletConnection,
          walletState:session.walletState,
          walletStatus:walletConnectionStatus(session.walletState,true,'dusk:0'),
          walletDialog:{open,busy:session.walletBusy,error:session.walletError,
            status:walletConnectionStatus(session.walletState,true,'dusk:0'),address:session.walletState.selectedAddress??'',
            onClose:kit.close,onConnect:session.handleOpenWalletConnection,onDisconnect:()=>{window.disconnected=true;kit.close()},onReferrals:()=>{}},
        },
      },
        React.createElement('h1',null,'Wallet test'))
    }
    root.render(React.createElement(Wallet))
  })
  await page.locator('.wallet-connect').click()
  await page.getByRole('dialog').waitFor()
  await page.waitForFunction(() => window.walletRequests === 1)
  await page.evaluate(() => window.rejectWallet())
  await page.getByRole('dialog').getByRole('alert').waitFor()
  assert.match(await page.getByRole('dialog').getByRole('alert').innerText(), /rejected/i)
  await page.getByRole('dialog').getByRole('button',{name:'Connect wallet',exact:true}).click()
  await page.waitForFunction(() => window.walletRequests === 2)
  await page.evaluate(() => window.approveWallet())
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  assert.equal(await page.evaluate(() => window.walletRequests), 2, 'Each click sends one connect request and closes only on success')
  const badge = await page.locator('.network-badge').boundingBox()
  const walletButton = await page.locator('.wallet-connect').boundingBox()
  assert.ok(badge.x + badge.width <= walletButton.x, 'The connected wallet does not overlap the network badge at 360px')
  await page.locator('.wallet-connect').click()
  await page.getByRole('dialog').getByRole('button', { name:'Close',exact:true }).click()
  await page.getByRole('dialog').waitFor({state:'detached'})
  await page.locator('.wallet-connect').click()
  await page.getByRole('dialog').getByRole('button', { name:'Disconnect',exact:true }).click()
  assert.equal(await page.evaluate(() => window.disconnected), true, 'Wallet menu controls receive pointer events inside the home shell')
  const finishedRefreshes = await page.evaluate(() => window.shellRefreshes)
  await page.clock.runFor(180_000)
  assert.equal(await page.evaluate(() => window.shellRefreshes), finishedRefreshes, 'Refresh listeners and timers stop on unmount')
  await page.evaluate(async () => {
    const {React,root} = window
    const {useFeeConfig} = await import('/src/features/treasury/useFeeConfig.ts')
    const {useTreasuryControls} = await import('/src/features/treasury/useTreasuryControls.ts')
    const {DEFAULT_FEE_CONFIG} = await import('/src/names/internal.ts')
    const client = {getFeeConfig:async()=>({...DEFAULT_FEE_CONFIG})}
    const noop = () => {}
    function Pricing() {
      const {feeConfig,loadFeeConfig} = useFeeConfig(client)
      const controls = useTreasuryControls({feeConfig,setFeeConfigConfirmation:noop,setFeeConfigUpdateError:noop,setTreasuryConfirmation:noop,setTreasuryError:noop})
      window.refreshPricing = loadFeeConfig
      return React.createElement('input',{'aria-label':'Draft price',value:controls.feeConfigForm.threeCharYearDusk,
        onChange:event=>controls.handleFeeConfigFieldChange('threeCharYearDusk',event.target.value)})
    }
    root.render(React.createElement(Pricing))
  })
  await page.getByRole('textbox',{name:'Draft price'}).fill('123')
  await page.evaluate(() => window.refreshPricing())
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve,0)))
  assert.equal(await page.getByRole('textbox',{name:'Draft price'}).inputValue(),'123','Background pricing refresh preserves an operator’s draft')
  await page.setViewportSize({width:1440,height:900})
  await checkNetworkFreshness(page)
}
export async function checkNetworkFreshness(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { AppShell } = await import('/src/app/AppShell.tsx')
    const { MarketplaceView } = await import('/src/features/marketplace/MarketplaceView.tsx')
    window.health = { ok: true, lagBlocks: 0, cursor: { updatedAt: new Date().toISOString() } }
    window.healthReads = 0
    const client = { getHealth: async () => { window.healthReads++; if (!window.health) throw new Error('Offline'); return window.health } }
    const config = { mode: 'live_ready', liveWritesEnabled: true, warnings: [], missingLiveInputs: [] }
    const noop = () => {}
    root.render(React.createElement(AppShell, {
      network: { label: 'Local', tone: 'local' },
      networkStatus: { config, client },
      launchLinks: {},
      runtimeNotice: null,
      skyNames: [],
      navigation: {
        mainView: 'marketplace',
        onMainViewChange: noop,
        onOpenName: noop,
        onSearchHome: noop,
        pendingReservationCount: 0,
        searching: false,
      },
      wallet: {
        onOpenWallet: noop,
        walletState: { accounts: [] },
        walletStatus: 'disconnected',
      },
    }, React.createElement(MarketplaceView, {
      listings: {
        auctions: [],
        fixedSales: [],
      },
      offers: {
        offers: [],
      },
      watchlist: {
        watchedNodes: [],
      },
      market: {
        marketplaceEnabled: true,
        updatedAt: Date.now(),
      },
      wallet: {
        actionsAvailable: false,
      },
      navigation: {
        tab: 'browse',
      },
      auction: {},
      selling: {},
      feedback: {},
      withdrawal: {},
    })))
  })
  await page.getByRole('heading', { name: 'Market', exact: true }).waitFor()
  await page.waitForFunction(() => window.healthReads > 0)
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    assert.equal(await page.locator('.network-status').count(), 0, 'Healthy name data needs no shell text')
    assert.equal(await page.locator('.marketplace-freshness').count(), 1)
    for (const [health, message] of [
      [{ ok: true, lagBlocks: 50 }, 'catching up'],
      [{ ok: true, lagBlocks: 0, cursor: { updatedAt: new Date(Date.now() - 180_000).toISOString() } }, 'behind'],
      [null, "Couldn't refresh. Retrying…"],
    ]) {
      await page.evaluate(value => { window.health = value; document.dispatchEvent(new Event('visibilitychange')) }, health)
      await page.locator('.marketplace-panel [role="status"]').filter({ hasText: message }).waitFor()
      assert.equal(await page.locator('.network-status').count(), 0, 'Read feedback belongs to the page, with no duplicate shell banner')
      assert.equal(await page.locator('.marketplace-panel [role="status"]').count(), 1)
      assert.equal(await page.locator('.marketplace-freshness').count(), 0, 'A network warning replaces market freshness')
    }
    await page.evaluate(() => {
      window.health = { ok: true, lagBlocks: 0, cursor: { updatedAt: new Date().toISOString() } }
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.locator('.marketplace-panel .search-status').waitFor({ state: 'detached' })
    await page.locator('.marketplace-freshness').waitFor()
  }
}
