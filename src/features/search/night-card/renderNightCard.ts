import animals from './animals.json'
import { LAYOUT, nameSizeFor, starCardSvg } from './card-core.js'
import { nightCardIdentity } from './nightCardIdentity'

const animalLabels = { owl: 'owl', bat: 'bat', fox: 'fox', wolf: 'wolf', moth: 'luna moth', hedgehog: 'hedgehog', raccoon: 'raccoon', cat: 'cat', heron: 'night heron', tarsier: 'tarsier', gecko: 'gecko', frog: 'tree frog' }
type Measure = (label: string, suffix: boolean) => number

// Measurements are at 110px, with the terminal .dusk measured separately in italic.
export function fitCardName(label: string, measure: Measure) {
  const width = measure(label, true)
  const size = nameSizeFor(width)
  if (width * LAYOUT.nameMin / 110 <= LAYOUT.nameWidth) return { size, lines: [label] }

  // Wrap only after the single-line minimum. Keep every character and the whole suffix.
  // For exceptionally long subnames, balance three lines and fit their width in SVG.
  const limit = Math.max(LAYOUT.nameWidth * 110 / 32, width / 3 + measure('m', false))
  const lines: string[] = []
  let line = ''
  for (const character of label) {
    if (line && measure(line + character, false) > limit && lines.length < 2) {
      lines.push(line)
      line = ''
    }
    line += character
  }
  if (measure(line, true) > limit && lines.length < 2) {
    lines.push(line)
    line = ''
  }
  lines.push(line)
  return { size: 32, lines }
}

export async function renderNightCard(name: string, idPrefix: string) {
  const [identity] = await Promise.all([
    nightCardIdentity(name),
    document.fonts.load('110px "Instrument Serif"'),
    document.fonts.load('italic 110px "Instrument Serif"'),
  ])
  const context = document.createElement('canvas').getContext('2d')
  if (!context) throw new Error('Name measurement is unavailable.')
  context.font = 'italic 110px "Instrument Serif"'
  const suffixWidth = context.measureText('.dusk').width
  context.font = '110px "Instrument Serif"'
  const measure: Measure = (text, suffix) => context.measureText(text).width + (suffix ? suffixWidth : 0)
  const label = name.replace(/\.dusk$/, '')
  const { size, lines } = fitCardName(label, measure)
  const { animal, nodeHex, skyKey } = identity
  const data = animals[animal]
  const source = starCardSvg({ label, nodeHex, skyKey, facets: data.facets,
    art: { ...data, href: `${import.meta.env.BASE_URL}night-cards/${animal}.webp` }, nameSize: size })
  const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement
  const text = svg.querySelector('text')!
  // Tall or tilted constellations can rise above the nominal title band. Keep descenders
  // clear of every star (including its glow), without moving the canonical artwork.
  const stars = svg.querySelector('g[transform]')!
  const [, bottom, degrees] = stars.getAttribute('transform')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
  const angle = degrees * Math.PI / 180
  const starsTop = Math.min(...Array.from(stars.querySelectorAll('circle'), circle => bottom
    + Number(circle.getAttribute('cx')) * Math.sin(angle)
    + Number(circle.getAttribute('cy')) * Math.cos(angle) - Number(circle.getAttribute('r'))))
  const labelDescent = context.measureText(label).actualBoundingBoxDescent
  context.font = 'italic 110px "Instrument Serif"'
  const descent = Math.max(labelDescent, context.measureText('.dusk').actualBoundingBoxDescent) * size / 110
  context.font = '110px "Instrument Serif"'
  const baseline = Math.min(LAYOUT.nameY, starsTop - 8 - descent)
  text.setAttribute('y', String(baseline))
  const setWidth = (element: Element, line: string, suffix: boolean) => {
    // Fix the measured advance: font hinting at phone scale otherwise widens long lines.
    element.setAttribute('textLength', String(Math.min(LAYOUT.nameWidth, measure(line, suffix) * size / 110)))
    element.setAttribute('lengthAdjust', 'spacingAndGlyphs')
  }
  if (lines.length > 1) {
    const suffix = text.querySelector('tspan')!
    text.replaceChildren()
    lines.forEach((line, index) => {
      const last = index === lines.length - 1
      const span = document.createElementNS(svg.namespaceURI!, 'tspan')
      span.setAttribute('x', '600')
      span.setAttribute('y', String(baseline - (lines.length - 1 - index) * 36))
      span.textContent = line
      if (last) span.append(suffix)
      setWidth(span, line, last)
      text.append(span)
    })
  } else setWidth(text, label, true)
  // Inline SVG IDs are document-wide; isolate gradients from the page and other cards.
  const markup = new XMLSerializer().serializeToString(svg)
    .replace(/id="([^"]+)"/g, `id="${idPrefix}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${idPrefix}-$1)`)
  const animalLabel = animalLabels[animal]
  return { svg: markup, alt: `Share card for ${name}: ${animal === 'owl' ? 'an' : 'a'} ${animalLabel} and its constellation` }
}
