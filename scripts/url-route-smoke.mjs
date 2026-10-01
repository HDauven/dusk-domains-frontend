import assert from 'node:assert/strict'

export async function checkAuctionRoute(page) {
  const node = `0x${'ab'.repeat(32)}`
  await page.evaluate(async node => {
    const { React, root } = window
    const { useUrlRoute } = await import('/src/app/useUrlRoute.ts')
    window.history.replaceState(null, '', `/market/auction/${node.toUpperCase()}/?network=local`)
    function Route() {
      const [mainView, setMainView] = React.useState('search')
      const [selectedAuctionNode, setSelectedAuctionNode] = React.useState('')
      useUrlRoute({ checked: false, searchedName: null, mainView, selectedAuctionNode,
        onOpenView: setMainView, onOpenAuction: setSelectedAuctionNode, onOpenName: () => {} })
      return React.createElement('div', { id: 'route-probe', 'data-node': selectedAuctionNode, 'data-view': mainView },
        React.createElement('button', { onClick: () => setSelectedAuctionNode('') }, 'All listings'),
        React.createElement('button', { onClick: () => setSelectedAuctionNode(node) }, 'View auction'))
    }
    root.render(React.createElement(Route))
  }, node)
  const initialHistory = await page.evaluate(() => history.length)
  await page.locator(`#route-probe[data-node="${node}"][data-view="marketplace"]`).waitFor()
  assert.equal(new URL(page.url()).pathname, `/market/auction/${node}`, 'Normalize an applied auction URL')
  assert.equal(new URL(page.url()).search, '?network=local')
  assert.equal(await page.evaluate(() => history.length), initialHistory, 'Normalization replaces the entry')
  await page.getByRole('button', { name: 'All listings' }).click()
  assert.equal(new URL(page.url()).pathname, '/market', 'Leaving the auction updates the URL')
  assert.equal(await page.evaluate(() => history.length), initialHistory + 1)
  await page.getByRole('button', { name: 'View auction' }).click()
  assert.equal(new URL(page.url()).pathname, `/market/auction/${node}`)
  await page.goBack()
  await page.locator('#route-probe[data-node=""]').waitFor()
  assert.equal(new URL(page.url()).pathname, '/market')
  await page.goBack()
  await page.locator(`#route-probe[data-node="${node}"]`).waitFor()
  assert.equal(new URL(page.url()).pathname, `/market/auction/${node}`)
}
