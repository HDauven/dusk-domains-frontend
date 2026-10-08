import assert from 'node:assert/strict'

export async function checkBrandNotices(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const el = React.createElement
    const { SearchResultOverview } = await import('/src/features/search/SearchResultOverview.tsx')
    const { SearchResultPanel } = await import('/src/features/search/SearchResultPanel.tsx')
    const { MarketplaceBrowse } = await import('/src/features/marketplace/MarketplaceBrowse.tsx')
    const noop = () => {}
    window.renderBrandNotice = (view, name = 'google.dusk', verified = false, owner = false) => {
      const verification = verified ? { status: 'verified' } : undefined
      const overview = {
        canRegister: view === 'claim', displayName: name, resultStatus: view === 'claim' ? 'available' : 'registered', resultIssues: [],
        onContinueRegistration: () => { window.brandClaimStarted = true }, onViewDetails: noop,
        quote: { duration: 1, expiryDate: '2027-10-08', feeConfigLoading: false, registrationFee: 10, onDurationChange: noop },
        reservation: { savedReservation: null },
      }
      const content = view === 'claim' ? el(SearchResultOverview, overview)
        : view === 'market' ? el(MarketplaceBrowse, {
          listings: { auctions: [], fixedSales: [{ name, verification, node: 'node', sellerAuthority: 'owner', priceLux: 10000000000, expiresAtBlockHeight: 200, escrowed: true }] },
          watchlist: { watchedNodes: [], onToggleWatch: noop }, navigation: { onTabChange: noop },
          market: { currentBlockHeight: 100 }, wallet: { selectedAuthority: '', selectedAddress: '' },
        }) : el(SearchResultPanel, {
          abuseUrl: 'https://github.com/HDauven/dusk-domains-frontend/issues/new?template=abuse-report.yml',
          headerProps: { displayName: name, verification, status: 'registered', primaryVerified: true, records: [], viewerAuthority: owner ? 'owner' : '' },
          overviewProps: overview, resultView: 'overview', nodeHex: 'node',
          management: { settingsProps: { managedName: { node: 'node', owner: 'owner' }, clock: {} }, subdomainsProps: { subnames: [] } },
        })
      root.render(el('main', { className: 'page-main', 'data-brand-view': view, 'data-verified': String(verified) }, content))
    }
  })
  for (const width of [1280, 360]) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(() => window.renderBrandNotice('claim'))
    const claim = page.getByRole('button', { name: 'Claim google.dusk', exact: true })
    await claim.waitFor()
    const notice = page.locator('.brand-claim-notice')
    assert.equal(await notice.textContent(), 'google.dusk matches a well-known brand. It will show as unverified unless its owner proves it with their website, and impersonating a brand may be illegal.')
    assert.ok(await claim.isEnabled())
    const noticeBox = await notice.boundingBox(), claimBox = await claim.boundingBox()
    assert.ok(noticeBox.y + noticeBox.height <= claimBox.y, 'Brand notice sits above Claim')
    await claim.click()
    assert.equal(await page.evaluate(() => window.brandClaimStarted), true)
    for (const view of ['name', 'market']) {
      await page.evaluate(view => window.renderBrandNotice(view), view)
      await page.locator(`[data-brand-view="${view}"]`).waitFor()
      const label = page.getByText('Unverified', { exact: true })
      await label.waitFor()
      // Name pages explain the label in visible text; compact market cards keep it in the hover title.
      if (view === 'name') await page.getByText('Not verified by google. Check before trusting it.', { exact: true }).waitFor()
      else assert.equal(await label.getAttribute('title'), 'Not verified by google. Check before trusting it.')
      if (view === 'name') {
        const url = new URL(await page.getByRole('link', { name: 'Report this name', exact: true }).getAttribute('href'))
        assert.equal(url.searchParams.get('name'), 'google.dusk')
        assert.equal(url.searchParams.get('title'), '[Abuse]: google.dusk')
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${view} fits ${width}px`)
      await page.evaluate(view => window.renderBrandNotice(view, 'google.dusk', true, true), view)
      await page.locator('[data-verified="true"]').waitFor()
      assert.equal(await label.count(), 0)
      if (view === 'name') assert.equal(await page.getByRole('link', { name: 'Report this name', exact: true }).count(), 1)
    }
    await page.evaluate(() => window.renderBrandNotice('claim', 'mail.google.dusk'))
    await page.getByRole('button', { name: 'Claim mail.google.dusk', exact: true }).waitFor()
    assert.equal(await page.locator('.brand-claim-notice').count(), 0)
  }
  console.log('PASS: brand notice, enabled claim, website verification, report URL and phone layout')
}
