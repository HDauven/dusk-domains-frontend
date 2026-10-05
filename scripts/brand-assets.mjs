#!/usr/bin/env node
// Renders every brand file from the two mark sources in brand/:
//   mark.svg        the master, for icons from 180 px, the logos and the social images
//   mark-small.svg  the 16 and 32 px variant, for favicons, the header and the share-card footer
// To change the logo, replace those files and run `npm run brand` (add `-- --indexer <dir>`
// to also update the indexer's share-card mark).
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import * as fontkit from 'fontkit'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const night = '#0c0919'
const ink = '#fff5ee'
const muted = '#c4b6cb'

/** The SVG's inner markup, without the outer <svg> element. */
export function innerSvg(svg) {
  return svg.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '')
}

/** Prefixes every id and reference, so the mark can sit inside another SVG with its own ids. */
export function prefixIds(svg, prefix) {
  return svg
    .replace(/\bid="([^"]+)"/g, `id="${prefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
    .replace(/(\bhref|xlink:href)="#([^"]+)"/g, `$1="#${prefix}$2"`)
}

/** The mark without its rounded corners, for icons the platform masks itself. */
export function fullBleed(svg) {
  return svg.replace(/(<clipPath id="tile">\s*<rect\b[^>]*?)\s+rx="[^"]*"/, '$1')
}

/** The mark placed in a box of `size` at (x, y), with its ids prefixed. */
export function nestedMark(svg, { x, y, size, prefix }) {
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 512 512">${innerSvg(prefixIds(svg, prefix))}</svg>`
}

/** Text as outlines, so the images do not depend on installed fonts. */
export function textPath(font, text, { size, x, baseline, fill, anchor = 'middle' }) {
  const run = font.layout(text)
  const scale = size / font.unitsPerEm
  let pen = 0
  const glyphs = run.glyphs.map((glyph, index) => {
    const position = run.positions[index]
    const path = glyph.path.toSVG()
    const placed = path ? `<path transform="translate(${pen + position.xOffset} ${position.yOffset})" d="${path}"/>` : ''
    pen += position.xAdvance
    return placed
  })
  const width = pen * scale
  const left = anchor === 'middle' ? x - width / 2 : x
  return { width, svg: `<g fill="${fill}" transform="translate(${left} ${baseline}) scale(${scale} ${-scale})">${glyphs.join('')}</g>` }
}

// The share card's scene: the sky, the sun and the planet with its rim (server/local-indexer/share/card.mjs).
function scene({ width, height, sun, horizon }) {
  return `<defs>
    <linearGradient id="sky" x2="0.3" y2="1"><stop stop-color="#171222"/><stop offset="0.6" stop-color="#35223c"/><stop offset="1" stop-color="#58344b"/></linearGradient>
    <linearGradient id="disc" x2="0.2" y2="1"><stop stop-color="#f2c5ab"/><stop offset="1" stop-color="#d79588"/></linearGradient>
    <linearGradient id="rim"><stop stop-color="#b173df"/><stop offset="0.55" stop-color="#d4b5eb"/><stop offset="0.8" stop-color="#f2c5ab"/><stop offset="1" stop-color="#d79588"/></linearGradient>
    <filter id="atmosphere" filterUnits="userSpaceOnUse" x="-200" y="-200" width="${width + 400}" height="${height + 400}"><feGaussianBlur stdDeviation="40"/></filter>
    <filter id="glow" filterUnits="userSpaceOnUse" x="-200" y="-200" width="${width + 400}" height="${height + 400}"><feGaussianBlur stdDeviation="12"/></filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#sky)"/>
  <circle cx="${sun.cx}" cy="${sun.cy}" r="${sun.r + 8}" fill="#f2c5ab" opacity="0.4" filter="url(#atmosphere)"/>
  <circle cx="${sun.cx}" cy="${sun.cy}" r="${sun.r}" fill="url(#disc)"/>
  <ellipse cx="${horizon.cx}" cy="${horizon.cy - 15}" rx="${horizon.rx}" ry="${horizon.ry}" fill="url(#rim)" opacity="0.85" filter="url(#atmosphere)"/>
  <ellipse cx="${horizon.cx}" cy="${horizon.cy}" rx="${horizon.rx}" ry="${horizon.ry}" fill="none" stroke="url(#rim)" stroke-width="14" filter="url(#glow)"/>
  <ellipse cx="${horizon.cx}" cy="${horizon.cy}" rx="${horizon.rx}" ry="${horizon.ry}" fill="#201529" stroke="url(#rim)" stroke-width="3"/>`
}

/** A default social image: the card's scene with the mark, the name and the site address. */
export function socialImage({ mark, display, width, height, sun, horizon, markSize, markTop, nameSize, nameBaseline, footerSize, footerBaseline }) {
  const name = textPath(display, 'Dusk Domains', { size: nameSize, x: width / 2, baseline: nameBaseline, fill: ink })
  const footer = textPath(display, 'dusk.domains', { size: footerSize, x: width / 2, baseline: footerBaseline, fill: muted })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${scene({ width, height, sun, horizon })}
  ${nestedMark(mark, { x: (width - markSize) / 2, y: markTop, size: markSize, prefix: 'mark-' })}
  ${name.svg}
  ${footer.svg}
</svg>`
}

function png(svg, width, background) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: width }, ...(background ? { background } : {}) }).render().asPng()
}

export function brandAssets({ mark, small, display }) {
  const square = fullBleed(mark)
  return {
    'public/favicon.svg': small,
    'public/dusk-domains-mark.svg': mark,
    'public/favicon.png': png(small, 128),
    'public/favicon-dark.png': png(small, 128),
    'public/apple-touch-icon.png': png(square, 180, night),
    'public/icon-192.png': png(mark, 192),
    'public/icon-512.png': png(mark, 512),
    'public/icon-maskable-512.png': png(square, 512, night),
    'public/dusk-domains-logo.png': png(mark, 512),
    'public/dusk-domains-logo-dark.png': png(mark, 512),
    'public/dusk-domains-logo-dark-bg.png': png(square, 512, night),
    'public/og-image.png': png(socialImage({
      mark, display, width: 1200, height: 630,
      sun: { cx: 890, cy: 458, r: 98 }, horizon: { cx: 600, cy: 870, rx: 900, ry: 400 },
      markSize: 128, markTop: 72, nameSize: 104, nameBaseline: 316, footerSize: 24, footerBaseline: 592,
    }), 1200),
    'public/og-image-square.png': png(socialImage({
      mark, display, width: 1200, height: 1200,
      sun: { cx: 860, cy: 905, r: 132 }, horizon: { cx: 600, cy: 1640, rx: 1100, ry: 700 },
      markSize: 200, markTop: 250, nameSize: 136, nameBaseline: 610, footerSize: 30, footerBaseline: 1140,
    }), 1200),
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2)
  const indexer = argv.includes('--indexer') ? resolve(argv[argv.indexOf('--indexer') + 1]) : null
  const read = (path) => readFileSync(resolve(root, path), 'utf8')
  const mark = read('brand/mark.svg')
  const small = read('brand/mark-small.svg')
  const display = fontkit.openSync(resolve(root, 'public/fonts/instrument-serif.woff2'))
  for (const [path, content] of Object.entries(brandAssets({ mark, small, display }))) {
    writeFileSync(resolve(root, path), content)
    console.log(`wrote ${path}`)
  }
  if (indexer) {
    // The share card nests the small mark beside "dusk.domains"; its ids are prefixed there.
    const target = resolve(indexer, 'server/local-indexer/share/mark.svg')
    writeFileSync(target, prefixIds(small, 'mark-'))
    console.log(`wrote ${target}`)
  }
}
