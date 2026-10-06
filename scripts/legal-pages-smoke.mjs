import assert from 'node:assert/strict'

export async function checkLegalPages(browser, baseUrl) {
  const context = await browser.newContext()
  const origin = new URL(baseUrl).origin
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
  const page = await context.newPage()
  try {
    for (const [path, title] of [['terms', 'Terms of Use'], ['privacy', 'Privacy Notice']]) {
      await page.goto(new URL(path, baseUrl).href)
      await page.getByRole('heading', { name: title, exact: true }).waitFor()
      await page.reload()
      await page.getByRole('heading', { name: title, exact: true }).waitFor()
      assert.equal(await page.title(), `${title} · Dusk Domains`)
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://dusk.domains/${path}`)
      assert.ok((await page.locator('meta[name="description"]').getAttribute('content')).includes('Dusk Domains'))
      assert.equal(await page.locator('footer a[href="/terms"]').textContent(), 'Terms')
      assert.equal(await page.locator('footer a[href="/privacy"]').textContent(), 'Privacy')
      const width = await page.locator('.legal-page').evaluate(element => element.getBoundingClientRect().width)
      assert.ok(width < 850, 'Legal text stays in a readable column')
    }
    await page.locator('footer a[href="/terms"]').click()
    await page.getByRole('heading', { name: 'Terms of Use', exact: true }).waitFor()
    assert.equal(new URL(page.url()).pathname, '/terms')
    await page.goBack()
    await page.getByRole('heading', { name: 'Privacy Notice', exact: true }).waitFor()
    await page.goForward()
    await page.getByRole('heading', { name: 'Terms of Use', exact: true }).waitFor()
    await page.setViewportSize({ width: 360, height: 800 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Legal page fits a phone')
    await page.locator('footer a[href="/privacy"]').click()
    await page.getByRole('heading', { name: 'Privacy Notice', exact: true }).waitFor()
    assert.equal(new URL(page.url()).pathname, '/privacy')
    console.log('PASS: legal deep links, reloads, metadata, footer navigation, history and phone layout')
  } finally {
    await context.close()
  }
}
