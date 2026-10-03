import assert from 'node:assert/strict'

export async function checkListingFeeReview(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { useMarketplaceFeature } = await import('/src/features/marketplace/useMarketplaceFeature.ts')
    const { MarketplaceReview } = await import('/src/features/marketplace/MarketplaceReview.tsx')
    const seller = `0x${'22'.repeat(32)}`, node = `0x${'11'.repeat(32)}`
    const owned = { node, canonicalName: 'aurora.dusk', owner: seller, status: 'active', subnameCount: 0, records: [] }
    window.listingFee = 250
    window.listingCalls = []
    const core = {
      getCurrentBlockHeight: async () => ({ ok: true, value: 1000 }),
      getName: async () => ({ ok: true, value: { canonicalName: owned.canonicalName, node, marketplaceTransferable: true,
          record: { owner: seller, lifecycle: { expiresAtBlock: 90000 } } } }),
    }
    const indexerClient = {
      getMarketplaceFixedSalesPage: async () => ({ fixedSales: [], nextCursor: null }),
      getMarketplaceAuctionsPage: async () => ({ auctions: [], nextCursor: null }),
      getMarketplaceOffersPage: async () => ({ offers: [], nextCursor: null }),
      getAllNames: async () => [owned],
      getHealth: async () => ({ currentBlockHeight: 1000, finalizedBlockHeight: 1000 }),
      getMarketplaceRefund: async () => null,
      getMarketplaceConfig: async () => ({ feeBps: window.listingFee }),
    }
    const args = { mainView: 'marketplace', tradingPaused: false, liveWritesAvailable: true, indexerClient,
      duskDomainsOnChainClient: core, marketplaceOnChainClient: {}, selectedAddress: 'seller', selectedAuthority: seller,
      ensurePublicBalanceForLiveWrite: async () => true, onOpenWalletConnection: () => {},
      runtimeConfig: { chainId: 'local', capabilities: { marketplace: true }, contracts: { marketplace: { contractId: `0x${'44'.repeat(32)}` } } },
      submitNameWrite: async (_name, call) => { window.listingCalls.push(call); return { status: 'executed' } },
    }
    function FeeReview() {
      const state = useMarketplaceFeature(args)
      window.feeReview = state
      const props = state.marketplaceProps
      return React.createElement(React.Fragment, null,
        React.createElement('output', { id: 'listing-fee', 'data-mode': props.selling.saleMode, 'data-tab': props.navigation.tab }, props.selling.feeBps),
        React.createElement(MarketplaceReview, { review: props.feedback.review, disabled: !props.wallet.actionsAvailable,
          onClose: props.feedback.onCancelReview, onConfirm: props.feedback.onConfirmReview }))
    }
    root.render(React.createElement(FeeReview))
  })
  await page.waitForFunction(() => document.querySelector('#listing-fee')?.textContent === '250')
  await page.evaluate(() => window.feeReview.marketplaceProps.navigation.onTabChange('sell'))
  await page.locator('#listing-fee[data-tab="sell"]').waitFor()
  for (const mode of ['fixed', 'auction']) {
    await page.evaluate(async mode => {
      window.listingFee = 250
      await window.feeReview.loadMarketplace()
      window.feeReview.marketplaceProps.selling.onSaleModeChange(mode)
    }, mode)
    await page.locator(`#listing-fee[data-mode="${mode}"]`).waitFor()
    await page.evaluate(() => window.feeReview.marketplaceProps.selling.onCreateListing())
    await page.getByRole('dialog').waitFor()
    assert.match(await page.getByRole('dialog').innerText(), /24\.375 DUSK/)
    // An unchanged poll must preserve the review.
    await page.evaluate(() => window.feeReview.loadMarketplace())
    assert.equal(await page.getByRole('dialog').count(), 1)
    await page.evaluate(async () => { window.listingFee = 1000; await window.feeReview.loadMarketplace() })
    await page.waitForFunction(() => document.querySelector('#listing-fee')?.textContent === '1000')
    assert.equal(await page.getByRole('dialog').count(), 0, `${mode}: fee changes invalidate the open review`)
    await page.evaluate(() => window.feeReview.marketplaceProps.feedback.onConfirmReview())
    assert.equal(await page.evaluate(() => window.listingCalls.length), 0, 'A stale review cannot submit')
    await page.evaluate(() => window.feeReview.marketplaceProps.selling.onCreateListing())
    await page.getByRole('dialog').waitFor()
    assert.match(await page.getByRole('dialog').innerText(), /22\.5 DUSK/)
    assert.match(await page.getByRole('dialog').innerText(), /2\.5 DUSK/)
    await page.getByRole('button', { name: 'Go back' }).click()
  }
  await page.evaluate(() => window.feeReview.marketplaceProps.selling.onCreateListing())
  await page.getByRole('dialog').waitFor()
  await page.getByRole('button', { name: 'Confirm in wallet' }).click()
  await page.waitForFunction(() => window.listingCalls.length === 1)
}
