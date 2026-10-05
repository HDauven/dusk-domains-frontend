import { readFileSync } from 'node:fs'
import * as fontkit from 'fontkit'
import { expect, it } from 'vitest'
import { fullBleed, innerSvg, nestedMark, prefixIds, textPath } from './brand-assets.mjs'

const mark = readFileSync(new URL('../brand/mark.svg', import.meta.url), 'utf8')
const small = readFileSync(new URL('../brand/mark-small.svg', import.meta.url), 'utf8')

it('prefixes every id and reference so a nested mark cannot reuse the host image ids', () => {
  const prefixed = prefixIds(small, 'mark-')
  expect(prefixed).not.toMatch(/\bid="(?!mark-)/)
  expect(prefixed).not.toMatch(/url\(#(?!mark-)/)
  for (const [, id] of prefixed.matchAll(/url\(#([^)]+)\)/g)) expect(prefixed).toContain(`id="${id}"`)
})

it('keeps the rounded tile in both sources and removes it only for full-bleed icons', () => {
  for (const source of [mark, small]) {
    expect(source).toMatch(/<clipPath id="tile">\s*<rect width="512" height="512" rx="116"\/>/)
    expect(fullBleed(source)).toMatch(/<clipPath id="tile">\s*<rect width="512" height="512"\/>/)
  }
})

it('nests the mark in a box without its outer svg element', () => {
  const nested = nestedMark(small, { x: 10, y: 20, size: 28, prefix: 'mark-' })
  expect(nested).toMatch(/^<svg x="10" y="20" width="28" height="28" viewBox="0 0 512 512">/)
  expect(innerSvg(small)).not.toContain('xmlns')
  expect(nested.match(/<svg\b/g)).toHaveLength(1)
})

it('sets text as outlines centred on the given x', () => {
  const font = fontkit.openSync(new URL('../public/fonts/instrument-serif.woff2', import.meta.url).pathname)
  const { width, svg } = textPath(font, 'Dusk Domains', { size: 100, x: 600, baseline: 300, fill: '#fff' })
  expect(width).toBeGreaterThan(400)
  expect(svg).toContain(`translate(${600 - width / 2} 300)`)
  expect(svg.match(/<path /g)).toHaveLength(11)
})
