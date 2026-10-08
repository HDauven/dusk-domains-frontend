import assert from 'node:assert/strict'

export async function checkWebsiteVerification(page) {
  const requests = []
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.route('**/api/verify?*', async route => {
    requests.push({ method: route.request().method(), name: new URL(route.request().url()).searchParams.get('name') })
    await route.fulfill({ json: { canonicalName: 'aurora.dusk', verification: {
      domain: 'harbourline.com', status: 'verified', checkedAt: new Date().toISOString(), dnssec: false,
    } } })
  })
  await page.evaluate(async () => {
    // Earlier smoke cases replace clipboard; restore the browser API for this check.
    delete navigator.clipboard
    const { React, root } = window, el = React.createElement
    const { WebsiteVerificationPanel } = await import('/src/features/domains/settings/WebsiteVerificationPanel.tsx')
    const { NameHeader } = await import('/src/features/search/NameHeader.tsx')
    const { NameCard } = await import('/src/components/ui/NameCard.tsx')
    const { ListingName } = await import('/src/features/marketplace/ListingName.tsx')
    const { createDuskDomainsIndexerClient } = await import('/src/names/http/client.ts')
    const client = createDuskDomainsIndexerClient({ baseUrl: new URL('/api', location.href).href })
    const owner = `0x${'ab'.repeat(32)}`
    function Probe() {
      const [verification, setVerification] = React.useState(undefined)
      window.setWebsiteVerification = setVerification
      return el('main', { id: 'website-verification-probe', style: { padding: 20, maxWidth: 650, margin: 'auto' } },
        el(NameHeader, { displayName: 'aurora.dusk', lifecycleLabel: null, primaryVerified: false, records: [], reserved: false, status: 'registered', verification }),
        el(WebsiteVerificationPanel, { name: 'aurora.dusk', owner, website: 'https://harbourline.com/about', verification,
          onCheck: async () => { const result = await client.verifyWebsite('aurora.dusk'); setVerification(result) } }),
        el(NameCard, { name: 'aurora.dusk', verification }),
        el(ListingName, { name: 'aurora.dusk', verification }))
    }
    root.render(el(Probe))
  })
  await page.getByRole('heading', { name: 'Verify your website' }).waitFor()
  assert.equal(await page.locator('#website-verification-probe .website-badge').count(), 0)
  await page.getByRole('button', { name: 'Copy TXT value', exact: true }).click()
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), `dusk-domains-verification=aurora.dusk;owner=0x${'ab'.repeat(32)}`)
  await page.getByRole('button', { name: 'Check now', exact: true }).click()
  await page.locator('.name-hero .website-badge').waitFor()
  assert.deepEqual(requests, [{ method: 'POST', name: 'aurora.dusk' }])
  assert.equal(await page.locator('#website-verification-probe .website-badge').count(), 4)
  for (const width of [1280, 360]) {
    await page.setViewportSize({ width, height: 900 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Verification record fits the viewport')
    const wrappedCopy = await page.locator('.verification-record .copy-label').evaluateAll(labels => labels.some(label => {
      const range = document.createRange()
      range.selectNodeContents(label)
      return range.getClientRects().length > 1
    }))
    assert.equal(wrappedCopy, false, 'TXT copy buttons keep their labels on one line')
  }
  await page.evaluate(() => window.setWebsiteVerification({ domain: 'harbourline.com', status: 'mismatch', checkedAt: new Date().toISOString(), dnssec: false }))
  await page.getByText('Doesn’t match — check the name and owner in your TXT record.', { exact: true }).waitFor()
  assert.equal(await page.locator('#website-verification-probe .website-badge').count(), 0)
  await page.unroute('**/api/verify?*')
  console.log('PASS: website badge states, TXT clipboard, verification POST and phone layout')
}
