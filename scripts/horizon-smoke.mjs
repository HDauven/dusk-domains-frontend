import assert from 'node:assert/strict'

// Sample the rendered atmosphere and footer, including when the page exceeds the viewport.
export async function checkHorizon(page) {
  let minimumContrast = Infinity
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
    for (const longPage of [false, true]) {
      await page.evaluate(long => { document.querySelector('.hero').style.minHeight = long ? '1600px' : '' }, longPage)
      const geometry = await page.evaluate(() => {
        const bounds = selector => {
          const box = document.querySelector(selector).getBoundingClientRect()
          return { x: box.x, y: box.y + window.scrollY, width: box.width, height: box.height }
        }
        const style = getComputedStyle(document.documentElement)
        return { planet: bounds('.sky-planet'), footer: bounds('.site-footer'), hero: bounds('.hero'),
          night: style.getPropertyValue('--night').trim(), body: style.getPropertyValue('--planet').trim(),
          text: [...document.querySelectorAll('.site-footer p, .site-footer a, .hero-copy p')].map(node => {
            const box = node.getBoundingClientRect()
            return { x: box.x + box.width / 2, y: box.y + window.scrollY + box.height / 2, color: getComputedStyle(node).color }
          }) }
      })
      assert.ok(geometry.hero.y + geometry.hero.height < geometry.planet.y, 'The rim stays below content')
      const hidden = await page.addStyleTag({ content: '.sky-dust, .sky-names, .site-footer > *, .hero-copy { visibility: hidden !important; }' })
      const screenshot = await page.screenshot({ fullPage: true })
      await hidden.evaluate(node => node.remove())
      const samples = await page.evaluate(async ({ png, geometry, width }) => {
        const image = new Image()
        image.src = `data:image/png;base64,${png}`
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0)
        const pixel = (x, y) => [...context.getImageData(Math.round(x), Math.round(y), 1, 1).data].slice(0, 3)
        const { planet, footer } = geometry
        return {
          horizon: [4, width / 2, width - 5].map(x => {
            const dx = (x - planet.x - planet.width / 2) / (planet.width / 2)
            const rim = planet.y + planet.height / 2 * (1 - Math.sqrt(1 - dx * dx))
            return { lilac: pixel(x, rim - 70), peach: pixel(x, rim - 8),
              aboveFooter: pixel(x, footer.y - 2), belowFooter: pixel(x, footer.y + 2), bottom: pixel(x, image.height - 2) }
          }),
          text: geometry.text.map(text => ({ ...text, background: pixel(text.x, text.y) })),
        }
      }, { png: screenshot.toString('base64'), geometry, width })
      const rgb = hex => hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16))
      const night = rgb(geometry.night), body = rgb(geometry.body)
      for (const sample of samples.horizon) {
        assert.ok(sample.lilac[0] >= night[0] + 35 && sample.lilac[2] >= night[2] + 35,
          `A broad glow spans the full width at ${width}: ${sample.lilac}`)
        assert.ok(sample.lilac[2] > sample.lilac[0] && sample.lilac[0] > sample.lilac[1], 'Lilac above the rim')
        assert.ok(sample.peach[0] > sample.peach[2] && sample.peach[0] > sample.lilac[0], 'A warm peach-lit rim')
        assert.deepEqual(sample.aboveFooter, body, 'Planet reaches the footer')
        assert.deepEqual(sample.belowFooter, body, 'No seam at the footer')
        assert.deepEqual(sample.bottom, body, 'Planet continues to the bottom')
      }
      for (const text of samples.text) {
        const ratio = contrast(text.color.match(/[\d.]+/g).slice(0, 3).map(Number), text.background)
        assert.ok(ratio >= 4.5, `Text over the sky or planet meets AA: ${ratio.toFixed(2)}:1`)
        minimumContrast = Math.min(minimumContrast, ratio)
      }
    }
  }
  await page.evaluate(() => { document.querySelector('.hero').style.minHeight = '' })
  console.log(`PASS: full-width lilac/peach horizon, continuous planet on short/long pages at both widths; text contrast ${minimumContrast.toFixed(2)}:1`)
}

function contrast(a, b) {
  const luminance = rgb => rgb.map(channel => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0)
  const first = luminance(a), second = luminance(b)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}
