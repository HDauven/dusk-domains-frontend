import assert from 'node:assert/strict'

// The longest legal record: a 64-byte key and a 512-byte value with no break in it. On the drill
// chain one such record made a single profile row 10,775 px tall.
const longKey = `${'k'.repeat(63)}z`
const longValue = 'v'.repeat(512)
// A row's key, three lines of value, a staged-change note and its buttons, which wrap below on a phone.
const ROW_LIMIT = 320

async function rows(page, selector) {
  return page.evaluate(selector => [...document.querySelectorAll(selector)].map(row => {
    const panel = row.closest('.panel').getBoundingClientRect(), box = row.getBoundingClientRect()
    return { height: Math.round(box.height), overflow: Math.round(Math.max(box.right - panel.right, panel.left - box.left, row.scrollWidth - row.clientWidth)), text: row.textContent.slice(0, 40) }
  }), selector)
}

// Every view that lists records keeps each row to a few lines, inside its panel, and shows the
// whole value on request.
export async function checkRecordLayout(page) {
  await page.evaluate(async ({ longKey, longValue }) => {
    await import('/src/index.css')
    await import('/src/App.css')
    const { React, root } = window
    const el = React.createElement
    const { DomainDetailsView } = await import('/src/features/domains/DomainDetailsView.tsx')
    const { RecordsView } = await import('/src/features/domains/RecordsView.tsx')
    const noop = () => {}
    const record = (key, value) => ({ key, value, visibility: 'public', ttlSeconds: 3600, updatedAt: '' })
    const records = [record('website', 'https://example.test'), record(longKey, longValue), record('text.description', 'Short'), record('url', `https://${'u'.repeat(500)}`)]
    window.renderRecordLayout = view => root.render(el('main', { className: 'page-main', id: 'record-layout' }, view === 'profile'
      ? el(DomainDetailsView, { displayName: 'noahedge.dusk', parentResolverRecords: records, onManageRecords: noop, onSubdomains: noop, paysPreviousOwner: null,
        primaryVerification: { tone: 'neutral', title: '', description: '', displayValue: '' }, subnames: [], viewerAuthority: '',
        activity: { activityEntries: [], currentBlockHeight: null, formatActivityTime: noop, onActivity: noop } })
      : el(RecordsView, { displayName: 'noahedge.dusk', editableRecordKeys: ['website'], resolverRecords: records,
        actions: { canRemoveRecords: true, canSaveRecords: false, error: '', onSaveRecords: noop, recordBusy: false, txState: null },
        draft: { criticalRecordChange: false, recordDraftMutations: [{ action: 'set', key: 'website', value: `https://${'w'.repeat(500)}` }], onDiscardDrafts: noop, onDiscardDraft: noop,
          onDraftValueChange: noop, recordDraftErrors: [], recordDraftValues: {} },
        wallet: { onUseWalletPublicAddress: noop, onUseWalletShieldedAddress: async () => {}, walletAddressAvailable: false } })))
  }, { longKey, longValue })
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const [view, selector] of [['profile', '.link-list li'], ['records', '.record-entry, .record-draft-review > div']]) {
      await page.evaluate(view => window.renderRecordLayout(view), view)
      await page.locator('#record-layout').waitFor()
      const measured = await rows(page, selector)
      assert.ok(measured.length >= 3, `${view} at ${width}px lists its records`)
      for (const row of measured) {
        assert.ok(row.height <= ROW_LIMIT, `${view} row "${row.text}" at ${width}px is ${row.height}px tall`)
        assert.ok(row.overflow <= 1, `${view} row "${row.text}" at ${width}px overflows its panel by ${row.overflow}px`)
      }
      // The full value is one click away, and the row then shows all of it.
      const row = page.locator(selector.split(',')[0]).filter({ hasText: longKey })
      const toggle = row.locator('.record-value-toggle')
      await toggle.click()
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true')
      const shown = await row.locator('.record-value > :is(p, code)').evaluate(value =>
        ({ full: value.textContent.length, clipped: value.scrollHeight > value.clientHeight + 1 }))
      assert.equal(shown.full, 512)
      assert.equal(shown.clipped, false)
    }
  }
  await page.setViewportSize({ width: 1280, height: 720 })
}
