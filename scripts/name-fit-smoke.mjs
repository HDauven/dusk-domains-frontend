import assert from 'node:assert/strict'

const labels = ['aurora', 'dryrun1707', 't202after', 'abcdefghijklmnopqrstuvwx', 'w'.repeat(63)]

// Use the real views with indexed-name and registration fixtures, without a chain or wallet.
export async function checkNameFit(page, screenshotDir) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(async labels => {
    await import('/src/index.css')
    await import('/src/App.css')
    const { React, root } = window
    const el = React.createElement
    const { AppShell } = await import('/src/app/AppShell.tsx')
    const { MyDomainsView } = await import('/src/features/domains/MyDomainsView.tsx')
    const { MarketplaceView } = await import('/src/features/marketplace/MarketplaceView.tsx')
    const { RegistrationFlowPanel } = await import('/src/features/registration/RegistrationFlowPanel.tsx')
    const { NameHeader } = await import('/src/features/search/NameHeader.tsx')
    const { SearchHero } = await import('/src/features/search/SearchHero.tsx')
    const { DomainDetailsView } = await import('/src/features/domains/DomainDetailsView.tsx')
    const { SubdomainList } = await import('/src/features/domains/subdomains/SubdomainList.tsx')
    const noop = () => {}
    const names = labels.map((label, i) => ({ canonicalName: `${label}.dusk`, node: `node-${i}`, records: [],
      subnameCount: 0, expiresAtBlockHeight: 9000000, graceEndsAtBlockHeight: 9100000 }))
    window.renderNameFit = (view, index = 0, count = names.length) => {
      const name = names[index].canonicalName
      const registration = { navigation: { onBackToOverview: noop }, resultIssues: [],
        status: { walletError: '', showReservationRecovery: false },
        wizard: { registrationComplete: view === 'success', registrationStep: 'review', displayName: name },
        step: {
          registrationStep: 'review',
          quote: {
            displayName: name,
            registrationFee: 10,
            duration: 1,
            expiryDate: '2027-10-01',
            registrationTargetAddress: 'owner',
          },
          wallet: {
            walletSetupState: 'connected',
            selectedAddress: 'owner',
          },
          purchase: {
            registrationCompletion: null,
            onSetAddress: noop,
          },
          reservation: {
            canPrepareCommit: true,
            commitWindow: { status: 'waiting', waitBlocks: 5, staleInBlocks: 100 },
          },
          primaryChoice: {
            onRegisterSetsPrimaryChange: noop,
            registerSetsPrimary: true,
          },
          referral: {},
        } }
      const content = view === 'my-names' ? el(MyDomainsView, {
        currentBlockHeight: 200,
        loading: false,
        myNamesError: '',
        pendingReservations: [],
        myNames: Array.from({ length: count }, (_, i) => ({ ...names[i % names.length], node: `node-${i}` })),
        primarySummaries: {},
        onForgetPendingReservation: noop,
        onOpenIndexedName: noop,
        onOpenPendingReservation: noop,
        onRefresh: noop,
        onSearchHome: noop,
        wallet: {
          selectedAddress: 'owner',
          onConnectWallet: noop,
        },
      })
        : view === 'market' || view === 'auction' ? el(MarketplaceView, {
          navigation: {
            tab: 'browse',
            onTabChange: noop,
          },
          market: {
            marketplaceEnabled: true,
            currentBlockHeight: 200,
          },
          wallet: {
            actionsAvailable: true,
            selectedAddress: 'buyer',
            selectedAuthority: 'buyer',
          },
          auction: {
            selectedAuctionNode: view === 'auction' ? names[index].node : undefined,
            auctionActivity: [],
            bidDrafts: {},
          },
          listings: {
            auctions: view === 'auction' ? [{ node: names[index].node, name, sellerAuthority: 'seller', reservePriceLux: 25e9, durationBlocks: 8640,
              startDeadlineBlockHeight: 3000, startBlockHeight: null, endBlockHeight: null, highestBid: null,
              bidCount: 0, feeBps: 250, escrowed: true, createdAtBlockHeight: 100 }] : [],
            fixedSales: names.map((name, i) => ({ node: name.node, name: name.canonicalName,
              sellerAuthority: 'seller', priceLux: (25 + i) * 1e9, privateBuyer: null, expiresAtBlockHeight: 9000000,
              openedAtBlockHeight: 100, escrowed: true })),
          },
          offers: {
            offers: [],
          },
          watchlist: {
            watchedNodes: [],
            onToggleWatch: noop,
          },
          selling: {},
          feedback: {},
          withdrawal: {},
        })
          : el('section', { className: 'result-area' },
            view === 'header' ? el(NameHeader, { displayName: name, status: 'available', records: [], primaryVerified: false, reserved: false })
              : view === 'subnames' ? el(SubdomainList, {
                onRecordTargetSelect: noop,
                subnames: names.map(name => ({ node: name.node, name: `child.${name.canonicalName}`, status: 'active', manager: 'owner', expiryPolicy: 'inherits_parent', expiresAt: 9000000 })),
                clock: {
                  currentBlockHeight: 200,
                  nowSeconds: 1790000000,
                },
                authority: {
                  selectedAuthority: 'owner',
                  ownerAddresses: [],
                },
                creation: {},
              })
                : view === 'chips' ? el(SearchHero, { checked: false, loading: false, query: '', onQueryChange: noop, onCheckAvailability: noop,
                  onOpenName: noop, featuredNames: names.map(name => ({ name: name.canonicalName })) })
                  : view === 'profile' ? el(DomainDetailsView, {
                    displayName: name,
                    parentResolverRecords: [],
                    paysPreviousOwner: null,
                    primaryVerification: { tone: 'neutral' },
                    viewerAuthority: 'owner',
                    onManageRecords: noop,
                    onSubdomains: noop,
                    subnames: names.map(name => ({ node: name.node, name: `child.${name.canonicalName}` })),
                    activity: {
                      currentBlockHeight: 200,
                      activityEntries: [],
                      formatActivityTime: noop,
                      onActivity: noop,
                    },
                  })
                    : el(RegistrationFlowPanel, registration))
      root.render(el(AppShell, {
        launchLinks: {},
        network: { label: 'Preview', tone: 'preview' },
        runtimeNotice: null,
        skyNames: [],
        navigation: {
          mainView: view === 'my-names' ? 'my-names' : ['market', 'auction'].includes(view) ? 'marketplace' : 'search',
          onMainViewChange: noop,
          onOpenName: noop,
          onSearchHome: noop,
          pendingReservationCount: 0,
          searching: true,
        },
        wallet: {
          onOpenWallet: noop,
          walletState: { accounts: [] },
          walletStatus: 'connected',
        },
      }, el('div', { 'data-name-fit-view': `${view}-${index}` }, content)))
    }
  }, labels)
  await checkContentSizedNames(page)
  await checkResponsiveNames(page)
  await checkAuctionHeading(page)
  const measurements = []
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    for (const view of ['my-names', 'market', 'auction', 'claim', 'success', 'chips', 'header', 'subnames', 'profile']) {
      const indexes = ['my-names', 'market', 'chips', 'subnames', 'profile'].includes(view) ? [0]
        : view === 'auction' ? [0, 3] : labels.map((_, index) => index)
      for (const index of indexes) {
        await page.evaluate(({ view, index }) => window.renderNameFit(view, index), { view, index })
        await page.locator(`[data-name-fit-view="${view}-${index}"] .name-signature`).first().waitFor()
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(50)
        if (view === 'market' || view === 'chips') {
          for (const label of labels) assert.equal(await page.getByRole(view === 'chips' ? 'button' : 'heading', { name: `${label}.dusk`, exact: true }).count(), 1)
        } else if (['auction', 'claim', 'success', 'header'].includes(view)) {
          assert.equal(await page.getByRole('heading', { name: `${labels[index]}.dusk${view === 'success' ? ' is yours' : ''}`, exact: true }).count(), 1)
        }
        const signatures = await measureNames(page)
        assert.ok(signatures.length, `${view}: names rendered`)
        for (const result of signatures) {
          const context = `${view} ${width}px ${result.name}`
          assert.equal(result.suffixLines, 1, `${context}: .dusk stays on one line`)
          assert.ok(result.fits, `${context}: every character stays inside the signature`)
          assert.ok(result.fontSize >= result.minimum, `${context}: readable minimum`)
          if (['chips', 'profile', 'subnames'].includes(view)) {
            assert.equal(result.fontSize, result.maximum, `${context}: keep the CSS size`)
            assert.equal(result.fittedSize, '', `${context}: no fitted size`)
          } else if (result.lines > 1) assert.equal(result.fontSize, result.minimum, `${context}: shrink before wrapping`)
          if (['aurora.dusk', 'child.aurora.dusk'].includes(result.name)) assert.equal(result.fontSize, result.maximum, `${context}: short names keep their size`)
          if (['aurora.dusk', 'dryrun1707.dusk', 't202after.dusk'].includes(result.name)) {
            assert.equal(result.labelLines, 1, `${context}: intact label`)
            assert.equal(result.lines, 1, `${context}: fit the whole name first`)
          }
        }
        if (['my-names', 'market', 'auction', 'claim', 'success', 'header'].includes(view)) {
          const boxes = await page.locator('.name-signature').evaluateAll(elements => elements.map(element => {
            const before = element.parentElement.getBoundingClientRect().width
            const fontSize = element.style.fontSize
            element.style.fontSize = '1px'
            const after = element.parentElement.getBoundingClientRect().width
            element.style.fontSize = fontSize
            return { name: element.textContent, before, after }
          }))
          for (const box of boxes) assert.ok(Math.abs(box.before - box.after) < 0.1, `${view} ${width}px ${box.name}: parent width is independent of text size`)
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${view} ${width}px: no horizontal overflow`)
        const file = `${view}-${indexes.length === 1 ? 'all' : index + 1}-${width}.png`
        measurements.push({ view, width, file, signatures })
        if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/${file}`, fullPage: true })
      }
    }
  }
  // Resize just a card's container: fitting must recover without a viewport change.
  await page.evaluate(() => window.renderNameFit('my-names'))
  await page.locator('.name-portrait-content').first().waitFor()
  for (const width of [160, 280, 120, 280]) {
    await page.locator('.name-portrait-content').first().evaluate((node, width) => { node.style.width = `${width}px` }, width)
    await page.waitForTimeout(50)
    const [result] = await measureNames(page)
    assert.equal(result.suffixLines, 1)
    assert.equal(result.labelLines, 1)
    assert.ok(result.fits)
    if (width === 160) assert.ok(result.fontSize > result.minimum && result.fontSize < result.maximum, 'Shrink before wrapping')
    if (width === 120) {
      assert.equal(result.lines, 2, 'Use the suffix break when the label fits at minimum size')
      assert.equal(result.fontSize, result.minimum)
    }
    if (width === 280) {
      assert.equal(result.fontSize, result.maximum, 'Restore the original size when space returns')
      assert.equal(result.fittedSize, '', 'Return sizing to CSS')
    }
  }
  console.log('PASS: name fitting and independent widths across cards, market, auction, claim, success and headers at desktop/phone widths')
  await checkSharedFitting(page)
  return measurements
}

async function checkAuctionHeading(page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.evaluate(() => window.root.render(null))
  await page.waitForFunction(() => !document.querySelector('.name-signature'))
  await page.evaluate(() => {
    const originalWrite = CSSStyleDeclaration.prototype.setProperty
    const originalRemove = CSSStyleDeclaration.prototype.removeProperty
    window.auctionFitWrites = 0
    CSSStyleDeclaration.prototype.setProperty = function (key, ...args) {
      if (key === '--name-fit-size') window.auctionFitWrites++
      return originalWrite.call(this, key, ...args)
    }
    CSSStyleDeclaration.prototype.removeProperty = function (key) {
      if (key === '--name-fit-size') window.auctionFitWrites++
      return originalRemove.call(this, key)
    }
    window.restoreAuctionWrites = () => {
      CSSStyleDeclaration.prototype.setProperty = originalWrite
      CSSStyleDeclaration.prototype.removeProperty = originalRemove
    }
    window.renderNameFit('auction', 3)
  })
  try {
    await page.getByRole('heading', { name: 'abcdefghijklmnopqrstuvwx.dusk', exact: true }).waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(250)
    const [result] = await measureNames(page)
    assert.equal(await page.evaluate(() => window.auctionFitWrites), 0, 'Auction at 1440px: no fitting writes when the long name has room')
    assert.equal(result.fontSize, 72, 'Auction at 1440px: keep the full heading size')
    assert.equal(result.fittedSize, '')
    assert.equal(result.lines, 1)
    assert.ok(result.fits)
    console.log('PASS: actual auction detail keeps a 24-character label at 72px with zero fitting writes at 1440px')
  } finally {
    await page.evaluate(() => window.restoreAuctionWrites())
  }
}

async function checkContentSizedNames(page) {
  await page.evaluate(() => {
    const originalWrite = CSSStyleDeclaration.prototype.setProperty
    window.chipFitWrites = 0
    CSSStyleDeclaration.prototype.setProperty = function (key, ...args) {
      if (key === '--name-fit-size') window.chipFitWrites++
      return originalWrite.call(this, key, ...args)
    }
    window.restoreChipWrites = () => { CSSStyleDeclaration.prototype.setProperty = originalWrite }
  })
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    for (const view of ['chips', 'profile']) {
      await page.evaluate(view => window.renderNameFit(view), view)
      const first = page.locator(`[data-name-fit-view="${view}-0"] li`).first()
      await first.waitFor()
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(250)
      const layout = await first.evaluate(li => ({ width: li.getBoundingClientRect().width,
        chip: li.querySelector('.name-chip').getBoundingClientRect().width, list: li.parentElement.getBoundingClientRect().width }))
      assert.ok(Math.abs(layout.width - layout.chip) < 1 && layout.width < layout.list, `${view}: actual content-sized list item`)
      const [result] = await measureNames(page)
      assert.equal(result.fontSize, 24, `${view}: short names do not shrink in content-sized lists`)
      assert.equal(result.lines, 1, `${view}: room for the whole short name`)
      assert.equal(result.fittedSize, '', `${view}: CSS controls chip size`)
      assert.equal(await page.evaluate(() => window.chipFitWrites), 0, `${view}: no fitted-size writes or resize feedback`)
    }
    console.log('PASS: SearchHero and profile content-sized list items keep 24px names with zero fitting writes')
  } finally {
    await page.evaluate(() => window.restoreChipWrites())
  }
}

async function checkResponsiveNames(page) {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.evaluate(() => window.renderNameFit('my-names'))
  await page.locator('.name-portrait-content').first().waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(100)
  const [before] = await measureNames(page)
  const box = page.locator('.name-portrait-content').first()
  const width = await box.evaluate(node => node.getBoundingClientRect().width)
  assert.equal(before.fontSize, 38.4)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.waitForTimeout(100)
  assert.equal(await box.evaluate(node => node.getBoundingClientRect().width), width, 'The capped card width stays unchanged')
  const [after] = await measureNames(page)
  assert.equal(after.fontSize, 43.2, '1280px → 1440px restores the larger responsive size without remounting')
  assert.equal(after.fittedSize, '', 'Do not store the responsive maximum')
  console.log('PASS: My names grows from 38.4px to 43.2px at the same capped card width')
}

async function checkSharedFitting(page) {
  await page.evaluate(() => window.root.render(null))
  await page.waitForFunction(() => !document.querySelector('.name-signature'))
  await page.evaluate(() => {
    const originalObserver = window.ResizeObserver
    const originalFrame = window.requestAnimationFrame
    const originalWrite = CSSStyleDeclaration.prototype.setProperty
    const originalMeasure = CanvasRenderingContext2D.prototype.measureText
    const observers = []
    const stats = { frames: [], writes: 0, measures: 0, fontLoads: 0 }
    const fontsLoaded = () => { stats.fontLoads++ }
    document.fonts.addEventListener('loadingdone', fontsLoaded)
    window.nameFitStats = stats
    window.ResizeObserver = class extends originalObserver {
      constructor(callback) {
        const record = { callback, entries: [] }
        super(entries => { record.entries = entries; callback(entries, this) })
        observers.push(record)
      }
    }
    window.requestAnimationFrame = callback => originalFrame.call(window, time => {
      stats.frames.push(time)
      callback(time)
    })
    CSSStyleDeclaration.prototype.setProperty = function (key, ...args) {
      if (key === '--name-fit-size') stats.writes++
      return originalWrite.call(this, key, ...args)
    }
    CanvasRenderingContext2D.prototype.measureText = function (...args) {
      stats.measures++
      return originalMeasure.apply(this, args)
    }
    window.repeatNameResize = () => {
      for (let i = 0; i < 5; i++) observers.forEach(record => record.callback(record.entries))
      return observers.length
    }
    window.restoreNameFit = () => {
      window.ResizeObserver = originalObserver
      window.requestAnimationFrame = originalFrame
      CSSStyleDeclaration.prototype.setProperty = originalWrite
      CanvasRenderingContext2D.prototype.measureText = originalMeasure
      document.fonts.removeEventListener('loadingdone', fontsLoaded)
    }
    window.renderNameFit('my-names', 0, 100)
  })
  try {
    await page.waitForFunction(() => document.querySelectorAll('.name-signature').length === 100)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(100)
    const before = await page.evaluate(() => window.nameFitStats)
    assert.equal(await page.evaluate(() => window.repeatNameResize()), 1, 'All 100 names share one observer')
    await page.waitForTimeout(100)
    assert.deepEqual(await page.evaluate(() => window.nameFitStats), before, 'Unchanged widths do not schedule or remeasure names')
    await page.evaluate(() => { for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('resize')) })
    await page.waitForTimeout(100)
    const unchanged = await page.evaluate(() => window.nameFitStats)
    assert.equal(unchanged.frames.length, before.frames.length + 1, 'Viewport notifications schedule one batched pass')
    assert.equal(unchanged.writes, before.writes, 'Unchanged inputs do not write sizes')
    assert.equal(unchanged.measures, before.measures, 'Unchanged inputs do not measure text')
    for (const width of [1200, 900, 600, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(100)
    }
    const after = await page.evaluate(() => window.nameFitStats)
    assert.ok(after.frames.length > before.frames.length, 'Resizing fits the names')
    assert.equal(new Set(after.frames).size, after.frames.length, 'Fitting runs at most once per animation frame')
    assert.equal(after.measures, before.measures * (1 + after.fontLoads - before.fontLoads), 'Resizing reuses text widths until fonts reload')
    console.log('PASS: 100 My names share one observer, fit once per frame, and skip unchanged widths')
  } finally {
    await page.evaluate(() => { window.root.render(null); window.restoreNameFit() })
  }
}

async function measureNames(page) {
  return page.locator('.name-signature').evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element)
    const box = element.getBoundingClientRect()
    const characters = node => {
      const range = document.createRange()
      return [...node.textContent].map((_, index) => {
        const text = node.nodeType === Node.TEXT_NODE ? node : node.firstChild
        range.setStart(text, index)
        range.setEnd(text, index + 1)
        const rect = range.getBoundingClientRect()
        return { top: rect.top, left: rect.left, right: rect.right }
      })
    }
    const label = characters(element.querySelector('.name-signature-label') ?? element.firstChild)
    const suffix = characters(element.querySelector('em'))
    const lines = chars => new Set(chars.map(char => Math.round(char.top))).size
    const minimum = parseFloat(style.getPropertyValue('--name-min-size'))
    const fontSize = parseFloat(style.fontSize)
    const maximum = parseFloat(style.getPropertyValue('--name-size'))
    return { name: element.textContent, fontSize, minimum, maximum, fittedSize: element.style.getPropertyValue('--name-fit-size'), labelLines: lines(label), suffixLines: lines(suffix),
      lines: lines([...label, ...suffix]), fits: [...label, ...suffix].every(char => char.left >= box.left - 1 && char.right <= box.right + 1) }
  }))
}
