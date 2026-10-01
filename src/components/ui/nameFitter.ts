const referenceSize = 100
const names = new Set<{ element: HTMLElement, name: string, box: HTMLElement, previous?: string }>()
const boxes = new Map<HTMLElement, { count: number, width?: number, revision: number, baseline?: boolean }>()
const widths = new Map<string, number>()
let observer: ResizeObserver | undefined
let frame: number | undefined
let context: CanvasRenderingContext2D | null = null

function schedule() {
  if (frame === undefined) frame = requestAnimationFrame(fitNames)
}

function fontsChanged() {
  widths.clear()
  for (const entry of names) entry.previous = undefined
  schedule()
}

function horizontalInsets(style: CSSStyleDeclaration) {
  return parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
    + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)
}

function fontRun(element: Element) {
  const style = getComputedStyle(element)
  return {
    text: element.textContent ?? '',
    font: `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${referenceSize}px ${style.fontFamily}`,
    kerning: style.fontKerning as CanvasFontKerning,
    stretch: style.fontStretch as CanvasFontStretch,
    spacing: parseFloat(style.letterSpacing) || 0,
  }
}

function fitNames() {
  frame = undefined
  // Finish all DOM reads before measuring text or writing any fitted sizes.
  const availableWidths = new Map<HTMLElement, number>()
  for (const [box, state] of boxes) {
    const style = getComputedStyle(box)
    const width = box.getBoundingClientRect().width - horizontalInsets(style)
    if (state.width === undefined || Math.abs(state.width - width) > 0.02) state.revision++
    state.width = width
    availableWidths.set(box, width)
  }
  const measurements = [...names].map(entry => {
    const style = getComputedStyle(entry.element)
    return {
      entry,
      available: availableWidths.get(entry.box)!,
      minimum: parseFloat(style.getPropertyValue('--name-min-size')),
      maximum: parseFloat(style.getPropertyValue('--name-size')),
      runs: [...entry.element.children].filter(child => child.textContent).map(fontRun),
    }
  })
  const updates = []
  for (const { entry, available, minimum, maximum, runs } of measurements) {
    if (available <= 0) continue
    const key = JSON.stringify([boxes.get(entry.box)!.revision, entry.name, minimum, maximum, runs])
    if (entry.previous === key) continue
    entry.previous = key
    let natural = 0
    let spacing = 0
    for (const run of runs) {
      const fontKey = JSON.stringify([run.text, run.font, run.kerning, run.stretch])
      let width = widths.get(fontKey)
      if (width === undefined) {
        context ??= document.createElement('canvas').getContext('2d')
        if (!context) continue
        context.font = run.font
        context.fontKerning = run.kerning
        context.fontStretch = run.stretch
        width = context.measureText(run.text).width
        widths.set(fontKey, width)
      }
      natural += width
      spacing += run.spacing * run.text.length
    }
    // Leave room for fractional glyph rounding, including the italic suffix.
    const size = Math.max(minimum, Math.min(maximum, referenceSize * ((available - 1) * 0.98 - spacing) / natural))
    updates.push({ entry, size: size < maximum ? `${size}px` : '' })
  }
  const writtenBoxes = new Set<HTMLElement>()
  for (const { entry: { element, box }, size } of updates) {
    if (element.style.getPropertyValue('--name-fit-size') === size) continue
    if (size) element.style.setProperty('--name-fit-size', size)
    else element.style.removeProperty('--name-fit-size')
    writtenBoxes.add(box)
  }
  for (const box of writtenBoxes) {
    boxes.get(box)!.baseline = true
    // Re-observe even if sizing stays unchanged, so a later external resize is not swallowed.
    observer!.unobserve(box)
    observer!.observe(box)
  }
}

export function registerName(element: HTMLElement, name: string) {
  const box = element.parentElement!
  if (!observer) {
    observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const state = boxes.get(entry.target as HTMLElement)
        if (!state) continue
        const width = entry.contentRect.width
        if (state.baseline) {
          // Accept our write's layout without invalidating the last fit.
          state.baseline = false
        } else if (state.width === undefined || Math.abs(state.width - width) > 0.02) {
          state.revision++
          schedule()
        }
        state.width = width
      }
    })
    const currentObserver = observer
    window.addEventListener('resize', schedule)
    document.fonts.addEventListener('loadingdone', fontsChanged)
    void document.fonts.ready.then(() => { if (observer === currentObserver) fontsChanged() })
  }
  const entry = { element, name, box }
  names.add(entry)
  const state = boxes.get(box)
  if (state) state.count++
  else {
    boxes.set(box, { count: 1, revision: 0 })
    observer.observe(box)
  }
  schedule()
  return () => {
    names.delete(entry)
    const state = boxes.get(box)!
    if (--state.count === 0) {
      observer!.unobserve(box)
      boxes.delete(box)
    }
    if (!names.size) {
      observer!.disconnect()
      observer = undefined
      window.removeEventListener('resize', schedule)
      document.fonts.removeEventListener('loadingdone', fontsChanged)
      if (frame !== undefined) cancelAnimationFrame(frame)
      frame = undefined
      widths.clear()
      context = null
    }
  }
}
