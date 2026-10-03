import assert from 'node:assert/strict'
import { checkHorizon } from './horizon-smoke.mjs'

// Render the shared controls in the same CSS and browser as the feature smoke checks.
export async function checkUiSystem(page) {
  await page.evaluate(async () => {
    await import('/src/index.css')
    await import('/src/App.css')
    const { React, root } = window
    const { Button } = await import('/src/components/ui/Button.tsx')
    const { Input } = await import('/src/components/ui/Input.tsx')
    const { TextField } = await import('/src/components/ui/FormControls.tsx')
    const { AddressChip } = await import('/src/components/ui/AddressChip.tsx')
    const { Dialog } = await import('/src/components/ui/Dialog.tsx')
    const { Tabs, TabPanel } = await import('/src/components/ui/Tabs.tsx')
    const { Panel } = await import('/src/components/ui/Panel.tsx')
    const { Badge } = await import('/src/components/ui/Badge.tsx')
    const { NameChip } = await import('/src/components/ui/NameChip.tsx')
    const { NameCard } = await import('/src/components/ui/NameCard.tsx')
    const { Toast } = await import('/src/components/ui/Toast.tsx')
    const el = React.createElement
    const address = '0x' + '12'.repeat(32)
    window.copyValue = address
    window.actions = 0
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: value => new Promise((resolve, reject) => { window.copiedValue = value; window.finishCopy = resolve; window.failCopy = reject }),
      } })
    function Probe() {
      const [open, setOpen] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [tab, setTab] = React.useState('one')
      const [value, setValue] = React.useState(address)
      window.selectProbeTab = setTab
      window.changeCopyValue = setValue
      window.setDialogBusy = setBusy
      return el(Panel, { id: 'ui-probe' },
        el('div', { id: 'variants' }, ...['primary', 'secondary', 'quiet', 'destructive'].map(variant => el(Button, { key: variant, variant }, variant))),
        el(Button, { disabled: true }, 'Disabled'),
        el(Button, { loading: true, onClick: () => window.actions++ }, 'Saving'),
        el(TextField, { label: 'Name', hint: 'Use a .dusk name', error: 'Enter a name', defaultValue: '' }),
        el(TextField, { label: 'Loading field', loading: true }),
        el('label', { className: 'marketplace-search-control' }, el('svg', { width: 16, height: 16 }), el(Input, { 'aria-label': 'Search marketplace' })),
        el(Button, { onClick: () => setOpen(true) }, 'Open dialog'),
        el(Dialog, { open, loading: busy, onClose: () => setOpen(false), labelledBy: 'probe-heading' },
          el('h2', { id: 'probe-heading' }, 'Review name'),
          el(Button, { onClick: () => setOpen(false), disabled: busy }, 'Close review'),
          el('a', { href: '#probe-heading' }, 'Review details')),
        el(Tabs, { id: 'probe-tabs', label: 'Probe sections', value: tab, onChange: setTab, items: [
            { id: 'one', label: 'One' }, { id: 'disabled', label: 'Disabled tab', disabled: true }, { id: 'two', label: 'Two' },
            { id: 'loading', label: 'Loading tab', loading: true }, { id: 'three', label: 'Three' },
          ] }),
        el(TabPanel, { id: 'probe-tabs', value: tab }, `Panel ${tab}`),
        el(AddressChip, { value }),
        el(NameChip, { name: 'averylongname'.repeat(8) + '.dusk', onClick: () => window.actions++ }),
        el('div', { id: 'badges' }, ...['available', 'taken', 'reserved', 'expiring', 'grace', 'paused'].map(status => el(Badge, { status, key: status }))),
        el(NameCard, { name: 'aurora.dusk', description: 'A supplied record.' }),
        el(Toast, { message: '' }),
      )
    }
    root.render(el(Probe))
  })
  const probe = page.locator('#ui-probe')
  await probe.waitFor()
  const saving = page.getByRole('button', { name: 'Saving' })
  assert.equal(await saving.isDisabled(), true, 'Loading buttons prevent duplicate actions')
  assert.equal(await saving.getAttribute('aria-busy'), 'true')
  assert.equal(await page.getByRole('textbox', { name: 'Loading field' }).isDisabled(), true)
  const field = page.getByRole('textbox', { name: 'Name', exact: true })
  assert.equal(await field.getAttribute('aria-invalid'), 'true')
  assert.match(await field.getAttribute('aria-describedby'), /hint.*error/)
  await field.focus()
  assert.equal(await field.evaluate(node => getComputedStyle(node).outlineStyle), 'solid')

  const searchInset = await page.locator('.marketplace-search-control').evaluate(node => {
    const input = node.querySelector('input'), icon = node.querySelector('svg')
    return { text: input.getBoundingClientRect().left + parseFloat(getComputedStyle(input).paddingLeft), icon: icon.getBoundingClientRect().right }
  })
  assert.ok(searchInset.text > searchInset.icon, 'Marketplace search text clears its icon')

  await page.getByRole('button', { name: 'Open dialog' }).click()
  const dialog = page.getByRole('dialog', { name: 'Review name' })
  await dialog.waitFor()
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Close review')
  await page.keyboard.press('Shift+Tab')
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Review details')
  await page.keyboard.press('Tab')
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Close review')
  await dialog.click({ position: { x: 8, y: 8 } })
  assert.equal(await dialog.isVisible(), true, 'Dialog padding does not dismiss it')
  await page.evaluate(() => window.setDialogBusy(true))
  await page.waitForFunction(() => document.querySelector('dialog')?.getAttribute('aria-busy') === 'true')
  await page.keyboard.press('Escape')
  assert.equal(await dialog.isVisible(), true, 'Busy dialogs retain the pending operation')
  await page.evaluate(() => window.setDialogBusy(false))
  await page.waitForFunction(() => !document.querySelector('dialog')?.hasAttribute('aria-busy'))
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'detached' })
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Open dialog')
  await page.getByRole('button', { name: 'Open dialog' }).click()
  await dialog.waitFor()
  await page.mouse.click(1, 1)
  await dialog.waitFor({ state: 'detached' })

  await page.evaluate(() => window.selectProbeTab('loading'))
  await page.waitForFunction(() => document.querySelector('#probe-tabs-loading')?.getAttribute('aria-selected') === 'true')
  assert.equal(await page.getByRole('tab', { name: 'One', exact: true }).getAttribute('tabindex'), '0', 'A busy selected tab leaves an enabled tab in the tab order')
  assert.equal(await page.getByRole('tab', { name: 'Loading tab', exact: true }).getAttribute('tabindex'), '-1')
  await page.evaluate(() => window.selectProbeTab('one'))
  await page.getByRole('tab', { name: 'One', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(await page.getByRole('tab', { name: 'Two', exact: true }).getAttribute('aria-selected'), 'true')
  await page.keyboard.press('End')
  assert.equal(await page.getByRole('tab', { name: 'Three', exact: true }).getAttribute('aria-selected'), 'true')
  await page.keyboard.press('ArrowRight')
  assert.equal(await page.getByRole('tab', { name: 'One', exact: true }).getAttribute('aria-selected'), 'true')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Home')
  const panelId = await page.getByRole('tab', { name: 'One', exact: true }).getAttribute('aria-controls')
  assert.equal(await page.locator(`#${panelId}`).getAttribute('aria-labelledby'), 'probe-tabs-one')
  assert.equal(await page.getByRole('tab', { name: 'Disabled tab' }).getAttribute('tabindex'), '-1')

  const reveal = page.getByRole('button', { name: 'Show full address', exact: true })
  await reveal.focus()
  await page.keyboard.press('Enter')
  assert.equal(await page.locator('.address-chip-full').isVisible(), true)
  const value = await page.evaluate(() => window.copyValue)
  assert.equal(await page.locator('.address-chip-full').textContent(), value)
  const copy = page.getByRole('button', { name: 'Copy address', exact: true })
  await copy.click()
  assert.equal(await copy.isDisabled(), true)
  assert.equal(await page.evaluate(() => window.copiedValue), value)
  await page.evaluate(() => window.finishCopy())
  await page.getByRole('status').filter({ hasText: 'address copied.' }).waitFor()
  await page.getByRole('button', { name: 'Dismiss notification' }).click()
  await copy.click()
  await page.evaluate(() => window.failCopy(new Error('Clipboard denied')))
  await page.getByRole('alert').filter({ hasText: 'Could not copy address. Select the full value and copy it.' }).waitFor()
  assert.equal(await page.locator('.address-chip-full').isVisible(), true)
  // A completion for a previous value cannot mark the new address as copied.
  await copy.click()
  await page.evaluate(() => { window.changeCopyValue('replacement'); window.finishCopy() })
  await page.waitForFunction(() => document.querySelector('.address-chip-full')?.textContent === 'replacement')
  assert.equal(await copy.textContent(), 'Copy')
  assert.equal(await page.getByRole('alert').count(), 0)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const motion = await probe.evaluate(node => [...node.querySelectorAll('*')].flatMap(element => [null, '::before', '::after'].map(pseudo => {
    const style = getComputedStyle(element, pseudo)
    return { animation: style.animationName, transition: style.transitionDuration }
  })))
  assert.ok(motion.every(style => style.animation === 'none' && style.transition === '0s'), 'Reduced motion disables every animation and transition')
  assert.equal(await page.locator('.name-portrait-content').evaluate(node => getComputedStyle(node).opacity), '1')

  // Read browser-computed colours on actual solid surfaces, including hover and disabled.
  const ratios = []
  for (const selector of ['#variants .button', '.button:disabled', '.input', '#badges .status-badge', '.name-portrait-content', '.name-portrait-description', '.name-chip']) {
    for (const element of await page.locator(selector).all()) {
      for (const hover of [false, true]) {
        if (hover) await element.hover()
        const colors = await element.evaluate(node => {
          const style = getComputedStyle(node)
          let surface = node
          while (getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)' && surface.parentElement) surface = surface.parentElement
          return { foreground: style.color, background: getComputedStyle(surface).backgroundColor }
        })
        const ratio = contrast(colors.foreground, colors.background)
        assert.ok(ratio >= 4.5, `${selector}${hover ? ':hover' : ''} contrast ${ratio.toFixed(2)}:1`)
        ratios.push(ratio)
      }
    }
  }
  await field.focus()
  const focus = await field.evaluate(node => ({ ring: getComputedStyle(node).outlineColor, surface: getComputedStyle(node).backgroundColor }))
  assert.ok(contrast(focus.ring, focus.surface) >= 3)
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `No overflow at ${width}`)
  }
  await page.evaluate(async () => {
    const { React, root } = window
    const { AppShell } = await import('/src/app/AppShell.tsx')
    const { SearchHero } = await import('/src/features/search/SearchHero.tsx')
    const noop = () => {}
    root.render(React.createElement(AppShell, {
      launchLinks: {},
      network: { label: 'Preview', tone: 'preview' },
      runtimeNotice: null,
      skyNames: [],
      navigation: {
        mainView: 'search',
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
    },
      React.createElement(SearchHero, { checked: false, loading: false, query: 'aurora', onQueryChange: noop, onCheckAvailability: noop })))
  })
  await page.getByRole('heading', { name: 'Find your .dusk name' }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
    const bounds = await page.evaluate(() => ({ hero: document.querySelector('.hero').getBoundingClientRect().bottom,
      horizon: document.querySelector('.sky-planet').getBoundingClientRect().top }))
    assert.ok(bounds.hero < bounds.horizon, 'The bright horizon stays below the readable content')
    assert.equal(await page.locator('.hero-copy').evaluate(node => getComputedStyle(node).opacity), '1', 'Reduced motion never hides the headline')
    const surface = await page.locator('.hero-search-field').evaluate(node => getComputedStyle(node).backgroundColor)
    assert.match(surface, /^rgb\(/, 'The search control is on a solid surface')
  }
  await checkHorizon(page)
  console.log(`PASS: Afterglow controls, keyboard, clipboard, reduced motion; minimum rendered text contrast ${Math.min(...ratios).toFixed(2)}:1`)
}

function contrast(first, second) {
  const luminance = value => value.match(/[\d.]+/g).slice(0, 3).map(Number).map(channel => {
    const linear = channel / 255
    return linear <= 0.04045 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4
  }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
  const a = luminance(first), b = luminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
