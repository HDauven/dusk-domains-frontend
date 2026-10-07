import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const baseUrl = process.env.DUSK_DOMAINS_E2E_BASE_URL || 'http://127.0.0.1:5217/'
const outputDir = process.env.DUSK_DOMAINS_E2E_OUTPUT_DIR || 'target/night-cards'
assert.ok(Number(new URL(baseUrl).port) >= 5217, 'Use a task port of 5217 or higher')
await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: process.env.DUSK_DOMAINS_E2E_CHROMIUM_PATH })
const results = []
const errors = []
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' })
    let releaseFonts, releaseArt
    const fonts = new Promise(resolve => { releaseFonts = resolve })
    const art = new Promise(resolve => { releaseArt = resolve })
    // Exercise the real name-page components with local fixtures. No chain or external services.
    await context.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.origin !== new URL(baseUrl).origin) {
        errors.push(`External request: ${url}`)
        return route.abort()
      }
      if (url.pathname.startsWith('/fonts/')) await fonts
      if (url.pathname.startsWith('/night-cards/')) await art
      if (route.request().isNavigationRequest()) {
        const response = await route.fetch()
        return route.fulfill({ response, body: (await response.text()).replace(/<script[^>]*src="\/src\/main.tsx"[^>]*><\/script>/, '') })
      }
      return route.continue()
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(new URL('/name/tminus.dusk', baseUrl).href, { waitUntil: 'domcontentloaded' })
    await page.evaluate(async () => {
      await import('/src/index.css')
      await import('/src/App.css')
      const main = await (await fetch('/src/main.tsx')).text()
      const hook = await (await fetch('/src/utils/useScopedState.ts')).text()
      const { default: React } = await import(hook.match(/from\s+["']([^"']*\/react\.js[^"']*)/)[1])
      const { default: ReactDOM } = await import(main.match(/from\s+["']([^"']*react-dom_client\.js[^"']*)/)[1])
      const { SearchWorkspace } = await import('/src/features/search/SearchWorkspace.tsx')
      const { AppShell } = await import('/src/app/AppShell.tsx')
      const { namehashHex } = await import('/src/names/hash.ts')
      const rootElement = document.getElementById('root')
      rootElement.removeAttribute('data-static-shell')
      const root = ReactDOM.createRoot(rootElement)
      const el = React.createElement, noop = () => {}
      window.renderNamePage = (name, registered = true) => {
        history.replaceState(null, '', `/name/${name}`)
        const node = namehashHex(name)
        root.render(el(AppShell, {
          network: { label: 'Local', tone: 'local' }, launchLinks: {}, runtimeNotice: null,
          skyNames: [{ label: name, node }],
          navigation: { mainView: 'search', onMainViewChange: noop, onOpenName: noop, onSearchHome: noop, pendingReservationCount: 0, searching: true },
          wallet: { onOpenWallet: noop, walletState: { accounts: [] }, walletStatus: 'disconnected' },
        }, el(SearchWorkspace, {
          search: { checked: true, resultReady: true, loading: false, query: name, onCheckAvailability: noop, onQueryChange: noop },
          result: {
            headerProps: { displayName: name, status: registered ? 'registered' : 'available', records: [], lifecycleLabel: null },
            detailsProps: { displayName: name, parentResolverRecords: [], subnames: [], primaryVerification: { tone: 'muted' }, activity: { activityEntries: [] } },
            overviewProps: { displayName: name, canRegister: true, resultStatus: 'available', resultIssues: [], quote: { duration: 1, expiryDate: '7 October 2027', registrationFee: 5, onDurationChange: noop }, reservation: {} },
            nodeHex: node, resultView: registered ? 'details' : 'overview', onResultViewChange: noop, management: {},
          },
        })))
      }
      window.renderNamePage('tminus.dusk')
    })
    const card = page.locator('.night-card')
    await card.waitFor()
    const placeholder = await card.boundingBox()
    assert.ok(placeholder.height > 100)
    assert.ok(Math.abs(placeholder.width / placeholder.height - 1200 / 630) < 0.01)
    assert.equal(await card.locator('svg').count(), 0, 'Reserve space before fonts and artwork load')
    releaseFonts()
    await card.locator('svg').waitFor()
    const beforeArt = await card.boundingBox()
    assert.equal(beforeArt.width, placeholder.width)
    assert.equal(beforeArt.height, placeholder.height)
    const shareBefore = await page.locator('.name-share').boundingBox()
    releaseArt()
    await page.waitForLoadState('networkidle')
    assert.deepEqual(await card.boundingBox(), beforeArt, 'Loading the WebP leaves the card box unchanged')
    assert.deepEqual(await page.locator('.name-share').boundingBox(), shareBefore, 'Loading art does not move the following controls')
    for (const [kind, name, registered] of [
      ['short', 'tminus.dusk', true],
      ['shrunk', 'm'.repeat(24) + '.dusk', false],
      ['long', 'm'.repeat(63) + '.dusk', false],
      ['descenders', 'g'.repeat(60) + '003.dusk', false],
      ['subname', 'sub.tminus.dusk', true],
      ['maximum-subname', Array(4).fill('m'.repeat(63)).join('.') + '.dusk', false],
    ]) {
      await page.evaluate(({ name, registered }) => window.renderNamePage(name, registered), { name, registered })
      await page.waitForFunction(name => document.querySelector('.night-card[aria-busy="false"] svg > g > text')?.textContent === name, name)
      await page.evaluate(() => document.fonts.ready)
      await page.waitForLoadState('networkidle')
      const geometry = await card.evaluate(box => {
        const svg = box.querySelector('svg'), text = svg.querySelector('g > text')
        const b = text.getBBox(), image = svg.querySelector('image')
        const lines = [...text.querySelectorAll(':scope > tspan[x]')]
        // SVG getBBox includes font leading. Canvas metrics give the visible glyph bounds.
        const measure = document.createElement('canvas').getContext('2d')
        const size = Number(text.getAttribute('font-size'))
        const glyphs = (lines.length ? lines : [text]).map(line => {
          const suffix = line.querySelector('[font-style="italic"]')
          const label = suffix ? line.textContent.slice(0, -5) : line.textContent
          measure.font = `${size}px "Instrument Serif"`
          const regular = measure.measureText(label)
          measure.font = `italic ${size}px "Instrument Serif"`
          const italic = measure.measureText(suffix ? '.dusk' : '')
          const baseline = Number(line.getAttribute('y'))
          return { top: baseline - Math.max(regular.actualBoundingBoxAscent, italic.actualBoundingBoxAscent), bottom: baseline + Math.max(regular.actualBoundingBoxDescent, italic.actualBoundingBoxDescent) }
        })
        const starGroup = svg.querySelector('g[transform]')
        const matrix = svg.getCTM().inverse().multiply(starGroup.getCTM())
        const corners = [...starGroup.querySelectorAll('line, circle')].flatMap(node => {
          const b = node.getBBox()
          return [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
            .map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix))
        })
        return {
          name: text.textContent, lines: lines.length || 1, size,
          text: { x: b.x, y: Math.min(...glyphs.map(glyph => glyph.top)), width: b.width, bottom: Math.max(...glyphs.map(glyph => glyph.bottom)) },
          animalTop: Number(image.getAttribute('y')), starsTop: Math.min(...corners.map(point => point.y)),
          starsLeft: Math.min(...corners.map(point => point.x)), starsRight: Math.max(...corners.map(point => point.x)),
          suffix: text.querySelector('[font-style="italic"]').textContent,
          width: box.getBoundingClientRect().width, height: box.getBoundingClientRect().height,
        }
      })
      assert.equal(geometry.name, name)
      assert.ok(geometry.lines <= 3, 'No more than three name lines')
      assert.equal(geometry.suffix, '.dusk')
      assert.ok(geometry.text.x >= 76 && geometry.text.x + geometry.text.width <= 1124, `The full name stays in the top band: ${JSON.stringify(geometry)}`)
      assert.ok(geometry.text.y >= 0)
      assert.ok(geometry.text.bottom < geometry.animalTop, 'Name clears the animal')
      assert.ok(geometry.text.bottom < geometry.starsTop || geometry.text.x + geometry.text.width < geometry.starsLeft || geometry.text.x > geometry.starsRight, 'Name clears the constellation')
      if (kind === 'long' || kind === 'maximum-subname') assert.equal(geometry.size, 32)
      if (kind === 'shrunk') assert.ok(geometry.size >= 48 && geometry.size < 96 && geometry.lines === 1)
      assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'), `https://dusk.domains/api/share/name/${name}.png`)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No phone overflow')
      await page.screenshot({ path: `${outputDir}/${kind}-${width}.png`, fullPage: true })
      await card.screenshot({ path: `${outputDir}/${kind}-card-${width}.png` })
      results.push({ viewportWidth: width, kind, ...geometry })
    }
    await context.close()
  }
  assert.deepEqual(errors, [])
  await writeFile(`${outputDir}/measurements.json`, JSON.stringify(results, null, 2) + '\n')
  console.log('PASS: Night Cards on registered/unregistered name pages, vectors’ representative animals, complete long names/subnames, metadata, fixed layout and desktop/phone screenshots')
} finally {
  await browser.close()
}
