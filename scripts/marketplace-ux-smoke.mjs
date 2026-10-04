import assert from 'node:assert/strict'

async function checkReviewPhone(page) {
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 844 })
    const dialog = page.getByRole('dialog')
    assert.equal(await dialog.evaluate(element => {
      const rect = element.getBoundingClientRect()
      return rect.left >= 0 && rect.right <= innerWidth && rect.height <= innerHeight && element.scrollWidth <= element.clientWidth + 1
    }), true, 'Reviews must fit phone widths without horizontal scrolling')
    assert.equal(await dialog.evaluate(element => element.scrollHeight <= element.clientHeight + 1), true, 'Standard marketplace reviews must fit vertically on a phone')
    for (const address of await dialog.locator('.marketplace-review-address code').all()) {
      assert.ok((await address.textContent()).length <= 19, 'Use a short wallet address in reviews')
      assert.ok(await address.evaluate(element => element.getBoundingClientRect().height <= 24), 'Addresses must stay on one line')
    }
    assert.equal(await dialog.locator('code').filter({ hasText: 'x'.repeat(30) }).count(), 0, 'No full wallet address in a review')
    await dialog.getByRole('button', { name: 'Confirm in wallet' }).scrollIntoViewIfNeeded()
    assert.equal(await dialog.getByRole('button', { name: 'Confirm in wallet' }).isVisible(), true)
  }
  await page.setViewportSize({ width: 1440, height: 900 })
}

export async function checkMarketplaceReviews(page) {
  await page.evaluate(async () => {
    await import('/src/App.css')
    await import('/src/index.css')
    const { React, root } = window
    const { useMarketplaceWrites } = await import('/src/features/marketplace/useMarketplaceWrites.ts')
    const { useFixedSales } = await import('/src/features/marketplace/useFixedSales.ts')
    const { useAuctions } = await import('/src/features/marketplace/useAuctions.ts')
    const { useMarketplaceRefund } = await import('/src/features/marketplace/useMarketplaceRefund.ts')
    const { MarketplaceBidReview } = await import('/src/features/marketplace/MarketplaceBidReview.tsx')
    const { useOffers } = await import('/src/features/marketplace/useOffers.ts')
    const { useSellForm } = await import('/src/features/marketplace/useSellForm.ts')
    const { MarketplaceReview } = await import('/src/features/marketplace/MarketplaceReview.tsx')
    const { namehashHex } = await import('/src/names/internal.ts')
    const seller = `0x${'22'.repeat(32)}`, buyer = `0x${'33'.repeat(32)}`
    const node = namehashHex('aurora.dusk')
    const sale = { saleId: 7, openedAtBlockHeight: 100, node, name: 'aurora.dusk', sellerAuthority: seller, priceLux: 25_123_456_789, privateBuyer: null, expiresAtBlockHeight: 5000, feeBps: 250 }
    const offer = { node, name: sale.name, buyerAuthority: buyer, amountLux: 20_123_456_789, expiresAtBlockHeight: 5000, feeBps: 250 }
    const auction = { auctionId: 8, feeBps: 250, startDeadlineBlockHeight: 5000, createdAtBlockHeight: 100, node, name: sale.name, sellerAuthority: seller, reservePriceLux: 25e9, startBlockHeight: null, endBlockHeight: null, highestBid: null, bidCount: 0, durationBlocks: 8640 }
    const auctions = [auction]
    const refund = { authority: buyer, amountLux: 25_123_456_789 }
    const owned = { node, canonicalName: sale.name, owner: seller, namespace: { descendantCount: 2, heldByOthersCount: 1 } }
    window.reviewCalls = []
    window.changedPrice = false
    const marketplaceOnChainClient = {
      getAuction: async () => ({ ok: true, value: { ...auction, reservePriceLux: 25_000_000_000n, startBlock: null, endBlock: null } }),
      getRefund: async () => ({ ok: true, value: { ...refund, amountLux: BigInt(refund.amountLux) } }),
      getFixedSale: async () => ({ ok: true, value: { ...sale, priceLux: BigInt(window.changedPrice ? 26e9 : 25_123_456_789), expiresAtBlock: 5000 } }),
      getOffer: async () => ({ ok: true, value: window.existingOffer ? { ...offer, amountLux: 20_123_456_789n, expiresAtBlock: 5000 } : null }),
    }
    const core = { getCurrentBlockHeight: async () => ({ ok: true, value: 1000 }), getName: async () => ({ ok: true, value: { canonicalName: sale.name, node, marketplaceTransferable: true, record: { owner: seller, lifecycle: { expiresAtBlock: 90000 } } } }) }
    const indexerClient = { getHealth: async () => ({ ok: true, finalizedBlockHeight: 1000 }) }
    function Probe({ wallet, scope }) {
      const [error, setError] = React.useState('')
      const [confirmation, setConfirmation] = React.useState('')
      const [, setTxState] = React.useState(null)
      const args = { actionsAvailable: true, feedbackScope: `${wallet}:${scope}`, duskDomainsOnChainClient: core, marketplaceOnChainClient,
        indexerClient, ensurePublicBalanceForLiveWrite: async () => true, feedback: { setError, setConfirmation, setTxState }, loadMarketplace: async () => {},
        onOpenWalletConnection: () => {}, runtimeConfig: { contracts: {} }, selectedAddress: `${wallet}-${"x".repeat(100)}`, selectedAuthority: wallet === 'seller' ? seller : buyer,
        submitNameWrite: async (_name, call) => { window.reviewCalls.push(call); return { status: 'executed' } } }
      const writes = useMarketplaceWrites(args)
      const fixed = useFixedSales({ ...args, writes, setError })
      const offers = useOffers({ ...args, writes, setError, marketplaceContractId: `0x${'44'.repeat(32)}`, ownedNames: [owned] })
      const sell = useSellForm({ ...args, writes, setError, marketplaceContractId: `0x${'44'.repeat(32)}`, selectedName: owned, feeBps: 250 })
      const bids = useAuctions({ ...args, writes, auctions, indexerClient: null, marketScope: 'local', accountScope: `${wallet}:${scope}`, selectedAuctionNode: '', setSelectedAuctionNode: () => {}, onBidPlaced: () => {}, setError, setConfirmation })
      const claimRefund = useMarketplaceRefund(refund, writes)
      window.marketProbe = { writes, fixed, offers, sell, sale, offer, bids, auction, claimRefund }
      return React.createElement(React.Fragment, null,
        React.createElement('output', { id: 'market-review-error' }, error),
        React.createElement('output', { id: 'market-review-confirmation' }, confirmation),
        React.createElement(MarketplaceReview, { review: writes.review, disabled: false, onClose: writes.cancelReview, onConfirm: writes.confirmReview }),
        React.createElement(MarketplaceBidReview, {
          auction: {
            bidReview: bids.bidReview,
            onCancelBidReview: () => bids.setBidReview(null),
            onPlaceBid: bids.placeBid,
          },
          wallet: {
            selectedAddress: args.selectedAddress,
            actionsAvailable: true,
          },
          market: {
            currentBlockHeight: 1000,
          },
          listings: {},
          selling: {},
          offers: {},
          feedback: {},
          watchlist: {},
          navigation: {},
          withdrawal: {},
        }))
    }
    window.renderMarketReview = (wallet = 'buyer', scope = 'browse') => root.render(React.createElement(Probe, { wallet, scope }))
    window.renderMarketReview()
  })
  await page.locator('#market-review-error').waitFor({ state: 'attached' })
  const calls = () => page.evaluate(() => window.reviewCalls.length)
  await page.evaluate(() => window.marketProbe.fixed.buyFixedSale(window.marketProbe.sale))
  assert.equal(await calls(), 0, 'Reviewing a purchase must not ask the wallet to sign')
  await page.getByRole('dialog').waitFor()
  assert.match(await page.getByRole('dialog').textContent(), /You pay25.123456789 DUSK/)
  assert.match(await page.getByRole('dialog').textContent(), /Name moves to your wallet/)
  assert.match(await page.getByRole('dialog').textContent(), /cannot be undone/)
  assert.equal(await page.locator('.marketplace-payment-split').count(), 1, 'Disclose the seller and treasury split under the total')
  assert.equal(await page.locator('.marketplace-payment-split').innerText(), '24.49537037 DUSK to the seller · 0.628086419 DUSK marketplace fee to treasury')
  assert.equal(await page.getByRole('dialog').getByTitle('25.123456789 DUSK').textContent(), '25.123456789 DUSK')
  await checkReviewPhone(page)
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copy Name moves to your wallet', exact: true }).click()
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), `buyer-${'x'.repeat(100)}`)
  await page.getByRole('button', { name: 'Go back' }).click()
  assert.equal(await calls(), 0)
  await page.evaluate(() => window.marketProbe.fixed.buyFixedSale(window.marketProbe.sale))
  await page.evaluate(() => { window.changedPrice = true })
  await page.getByRole('button', { name: 'Confirm in wallet' }).click()
  await page.waitForFunction(() => document.querySelector('#market-review-error').textContent.includes('changed on-chain'))
  assert.equal(await calls(), 0, 'Recheck the contract after review, before signing')
  await page.evaluate(() => { window.changedPrice = false; return window.marketProbe.fixed.buyFixedSale(window.marketProbe.sale) })
  await page.getByRole('button', { name: 'Confirm in wallet' }).click()
  await page.waitForFunction(() => window.reviewCalls.length === 1)
  await page.waitForFunction(() => document.querySelector('#market-review-confirmation').textContent.includes('25.123456789 DUSK paid.'))

  await page.evaluate(() => { window.marketProbe.offers.setOfferName('aurora.dusk'); window.marketProbe.offers.setOfferAmountDusk('20.123456789') })
  await page.waitForFunction(() => window.marketProbe.offers.offerName === 'aurora.dusk')
  await page.evaluate(() => window.marketProbe.offers.placeOffer())
  assert.equal(await calls(), 1, 'Offers need review before signing')
  await page.getByRole('dialog').waitFor()
  assert.match(await page.getByRole('dialog').innerText(), /20\.123456789 DUSK/)
  assert.match(await page.getByRole('dialog').textContent(), /cancel the offer.*withdraw the refund/)
  await checkReviewPhone(page)
  assert.equal(await calls(), 1)
  // A review prepared for another wallet must disappear on account or tab changes.
  await page.evaluate(() => window.renderMarketReview('seller', 'offers'))
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await page.evaluate(() => { window.existingOffer = true; return window.marketProbe.offers.acceptOffer(window.marketProbe.offer) })
  await page.getByRole('dialog').waitFor()
  assert.match(await page.getByRole('dialog').textContent(), /19.62037037 DUSK/)
  assert.equal(await page.getByRole('dialog').getByTitle(`seller-${'x'.repeat(100)}`).textContent(), 'seller-xxx...xxxxxx')
  await checkReviewPhone(page)
  assert.equal(await calls(), 1)
  assert.match(await page.getByRole('dialog').textContent(), /Includes 2 subnames · 1 held by others/)
  assert.match(await page.getByRole('dialog').textContent(), /can take back any subname/)
  assert.equal(await page.getByRole('button', { name: 'Confirm in wallet' }).isDisabled(), true)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Confirm in wallet' }).click()
  await page.waitForFunction(() => window.reviewCalls.length === 2)
  await page.waitForFunction(() => document.querySelector('#market-review-confirmation').textContent.includes('20.123456789 DUSK paid from escrow.'))
  await page.evaluate(() => window.marketProbe.sell.setPrivateBuyer(`0x${'33'.repeat(32)}`))
  await page.waitForFunction(() => window.marketProbe.sell.privateBuyer.length === 66)
  await page.evaluate(() => window.marketProbe.sell.createListing())
  assert.equal(await calls(), 2, 'Listings need review before signing')
  await page.getByRole('dialog').waitFor()
  assert.match(await page.getByRole('dialog').textContent(), /Marketplace escrow/)
  assert.match(await page.getByRole('dialog').textContent(), /24.375 DUSK/)
  assert.equal(await page.getByRole('dialog').getByTitle('24.375 DUSK').textContent(), '24.375 DUSK')
  await checkReviewPhone(page)
  assert.equal(await calls(), 2)
  assert.equal(await page.getByRole('button', { name: 'Confirm in wallet' }).isDisabled(), true)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Confirm in wallet' }).click()
  await page.waitForFunction(() => window.reviewCalls.length === 3)
  await page.evaluate(() => window.marketProbe.sell.setSaleMode('auction'))
  await page.waitForFunction(() => window.marketProbe.sell.saleMode === 'auction')
  await page.evaluate(() => window.marketProbe.sell.createListing())
  await page.getByRole('dialog').waitFor()
  assert.match(await page.getByRole('dialog').textContent(), /before the first bid/)
  await checkReviewPhone(page)
  await page.evaluate(() => window.renderMarketReview('seller', 'browse'))
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  assert.equal(await calls(), 3, 'Changing tabs discards the pending review')
  await page.evaluate(() => { window.existingOffer = false; window.renderMarketReview('buyer', 'offers') })
  await page.waitForFunction(() => window.marketProbe.writes.review === null)
  await page.evaluate(() => window.marketProbe.offers.placeOffer())
  await page.getByRole('dialog').waitFor()
  await page.getByRole('button', { name: 'Confirm in wallet' }).click()
  await page.waitForFunction(() => document.querySelector('#market-review-confirmation').textContent.includes('20.123456789 DUSK moved into escrow.'))
  assert.equal(await calls(), 4)
  await page.evaluate(() => window.marketProbe.bids.setBidDraft(window.marketProbe.auction.node, '25.123456789'))
  await page.waitForFunction(() => window.marketProbe.bids.bidDrafts[window.marketProbe.auction.node] === '25.123456789')
  await page.evaluate(() => window.marketProbe.bids.reviewBid(window.marketProbe.auction))
  await page.getByRole('dialog').waitFor()
  assert.equal(await page.locator('.marketplace-review-amount strong').innerText(), '25.123456789 DUSK')
  await page.getByRole('button', { name: 'Confirm in wallet' }).click()
  await page.waitForFunction(() => document.querySelector('#market-review-confirmation').textContent.includes('25.123456789 DUSK moved into escrow.'))
  assert.equal(await calls(), 5)
  await page.evaluate(() => window.marketProbe.claimRefund())
  await page.waitForFunction(() => document.querySelector('#market-review-confirmation').textContent.includes('25.123456789 DUSK withdrawn to your wallet.'))
  assert.equal(await calls(), 6)
}

export async function checkMarketplaceBrowse(page) {
  await page.evaluate(async () => {
    await import('/src/App.css')
    const { React, root } = window
    const { MarketplaceBrowse } = await import('/src/features/marketplace/MarketplaceBrowse.tsx')
    const { MarketplaceOffers } = await import('/src/features/marketplace/MarketplaceOffers.tsx')
    const { MarketplaceAuctionDetail } = await import('/src/features/marketplace/MarketplaceAuctionDetail.tsx')
    const seller = `0x${'22'.repeat(32)}`, buyer = `0x${'33'.repeat(32)}`
    const auction = { node: 'auction', name: 'auction.dusk', sellerAuthority: seller, reservePriceLux: 25e9, durationBlocks: 8640,
      startDeadlineBlockHeight: 3000, startBlockHeight: 900, endBlockHeight: 3000, highestBid: { bidderAuthority: buyer, amountLux: 36_465_187_500, placedAtBlockHeight: 1000 },
      bidCount: 1, feeBps: 250, escrowed: true, createdAtBlockHeight: 900 }
    const sale = { node: 'fixed', name: 'fixed.dusk', priceLux: 250000e9, sellerAuthority: seller, privateBuyer: null,
      expiresAtBlockHeight: 2000, openedAtBlockHeight: 1000, escrowed: true }
    const props = {
      listings: {
        auctions: [auction],
        fixedSales: [sale],
      },
      market: {
        currentBlockHeight: 1000,
      },
      watchlist: {
        watchedNodes: ['auction'],
        onToggleWatch: () => {},
      },
      wallet: {
        selectedAuthority: buyer,
        selectedAddress: 'buyer',
        actionsAvailable: true,
      },
      navigation: {
        onTabChange: () => {},
      },
      auction: {
        onOpenAuction: () => {},
        bidDrafts: {},
        onBidDraftChange: (_node, value) => { window.minimumUsed = value },
        auctionActivity: [{ id: 'bid', eventType: 'domain_bid_placed', target: '40000000000', actor: buyer, blockHeight: 1000, timestamp: '' },
        { id: 'creation', eventType: 'domain_auction_created', target: '25000000000', actor: seller, blockHeight: 900, timestamp: '' }],
      },
      selling: {},
      offers: {},
      feedback: {},
      withdrawal: {},
    }
    window.marketBrowseProps = props
    window.renderMarketBrowse = () => root.render(React.createElement('div', { className: 'marketplace-panel' }, React.createElement(MarketplaceBrowse, props)))
    window.renderMarketAuction = () => root.render(React.createElement('div', { className: 'marketplace-panel' }, React.createElement(MarketplaceAuctionDetail, { selectedAuction: auction, ...props })))
    window.renderMarketOffers = () => root.render(React.createElement('div', { className: 'marketplace-panel' }, React.createElement(MarketplaceOffers, {
      ...props,
      offers: {
        ...props.offers,
        offerName: '',
        offerAmountDusk: '25',
        offerDurationDays: '7',
        offers: [
          { node: 'one', name: 'one.dusk', buyerAuthority: buyer, amountLux: 25e9, placedAtBlockHeight: 1000, expiresAtBlockHeight: 3000 },
          { node: 'two', name: 'two.dusk', buyerAuthority: seller, amountLux: 50e9, placedAtBlockHeight: 1100, expiresAtBlockHeight: 2000 },
        ],
      },
      selling: {
        ...props.selling,
        sellableNames: [],
      },
    })))
    window.renderMarketBrowse()
  })
  await page.getByLabel('Sort marketplace').waitFor()
  assert.match(await page.locator('.marketplace-card').first().textContent(), /fixed.dusk/)
  await page.getByLabel('Sort marketplace').selectOption('price-low')
  assert.match(await page.locator('.marketplace-card').first().textContent(), /auction.dusk/)
  await page.getByRole('button', { name: 'Buy now', exact: true }).click()
  assert.equal(await page.locator('.marketplace-card').count(), 1)
  await page.setViewportSize({ width: 390, height: 844 })
  assert.match(await page.locator('.marketplace-card').textContent(), /250000 DUSK/)
  assert.equal(await page.locator('.marketplace-card-metrics dd').first().evaluate(element => {
    const style = getComputedStyle(element)
    return style.textOverflow !== 'ellipsis' && element.scrollWidth <= element.clientWidth + 1
  }), true, 'Large prices must remain complete at phone width')
  await page.getByRole('button', { name: 'Watching 1', exact: true }).click()
  assert.match(await page.locator('.marketplace-card').textContent(), /auction.dusk/)
  await page.getByRole('searchbox', { name: 'Search marketplace' }).fill('missing')
  assert.equal(await page.locator('.marketplace-card').count(), 0)

  await page.evaluate(() => window.renderMarketOffers())
  await page.getByLabel('Filter offers').selectOption('sent')
  assert.equal(await page.locator('.marketplace-offer-row').count(), 1)
  assert.match(await page.locator('.marketplace-offer-row').textContent(), /Buyer You/)
  await page.getByLabel('Filter offers').selectOption('all')
  await page.getByLabel('Sort offers').selectOption('price-high')
  assert.match(await page.locator('.marketplace-offer-row').first().textContent(), /two.dusk/)
  await page.getByRole('searchbox', { name: 'Search offers' }).fill('one')
  assert.equal(await page.locator('.marketplace-offer-row').count(), 1)

  await page.evaluate(() => window.renderMarketAuction())
  await page.getByRole('heading', { name: 'Bids · 1', exact: true }).waitFor()
  assert.equal(await page.locator('.marketplace-auction-activity li').count(), 1)
  assert.equal(await page.getByRole('button', { name: 'Review bid', exact: true }).isVisible(), false)
  await page.getByText('Raise bid', { exact: true }).click()
  assert.equal(await page.getByRole('button', { name: 'Review bid', exact: true }).isVisible(), true)
  await page.getByRole('button', { name: 'Use minimum', exact: true }).click()
  assert.equal(await page.evaluate(() => window.minimumUsed), '38.29')
  assert.equal(await page.getByRole('textbox', { name: 'Bid on auction.dusk' }).inputValue(), '38.29')
  assert.match(await page.locator('.marketplace-minimum-row').textContent(), /Minimum 38.29 DUSK/)
  assert.equal(await page.locator('.marketplace-bid-price strong').innerText(), '36.47 DUSK')
  assert.equal(await page.locator('.marketplace-bid-price strong').evaluate(element => {
    const style = getComputedStyle(element)
    return !/mono/i.test(style.fontFamily) && style.fontVariantNumeric.includes('tabular-nums')
  }), true, 'Headline amounts use the UI face and tabular numerals')
  const timer = await page.getByRole('timer').textContent()
  await page.waitForFunction(value => document.querySelector('[role="timer"]').textContent !== value, timer)
  await page.evaluate(async () => {
    const { MarketplaceBidReview } = await import('/src/features/marketplace/MarketplaceBidReview.tsx')
    const { React, root, marketBrowseProps: props } = window
    root.render(React.createElement(MarketplaceBidReview, {
      ...props,
      wallet: {
        ...props.wallet,
        selectedAddress: `buyer-${'x'.repeat(100)}`,
      },
      auction: {
        ...props.auction,
        onCancelBidReview: () => {},
        bidReview: { auction: { ...props.listings.auctions[0], name: 'uxdemo.dusk', highestBid: { ...props.listings.auctions[0].highestBid, amountLux: 43_123_456_789 } },
          amountDusk: '46.123456789', amountLux: 46_123_456_789n, minimumBidLux: 45_279_629_629n },
      },
    }))
  })
  await page.getByRole('dialog').waitFor()
  assert.equal(await page.locator('.marketplace-review-amount strong').innerText(), '46.123456789 DUSK')
  await checkReviewPhone(page)
}

export async function checkMarketplaceInventory(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { useSellInventory } = await import('/src/features/marketplace/useSellInventory.ts')
    const owner = `0x${'ab'.repeat(32)}`
    const names = ['one', 'two'].map(node => ({ node, canonicalName: `${node}.dusk`, owner, status: 'active', subnameCount: 0 }))
    function Inventory({ listed }) {
      const state = useSellInventory({ accountScope: 'wallet', ownedNames: names, auctions: [], fixedSales: listed ? [{ node: 'one' }] : [], selectedAuthority: owner.toUpperCase() })
      window.sellInventory = state
      return React.createElement('output', { id: 'market-inventory' }, state.selectedNode)
    }
    window.renderInventory = listed => root.render(React.createElement(Inventory, { listed }))
    window.renderInventory(false)
  })
  await page.waitForFunction(() => document.querySelector('#market-inventory')?.textContent === 'one')
  await page.evaluate(() => window.sellInventory.setSelectedNode('one'))
  await page.evaluate(() => window.renderInventory(true))
  await page.waitForFunction(() => document.querySelector('#market-inventory')?.textContent === 'two')
  assert.equal(await page.evaluate(() => window.sellInventory.sellableNames.length), 1, 'An escrowed name must leave the seller picker')
}
