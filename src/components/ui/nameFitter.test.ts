import { afterEach, expect, it, vi } from 'vitest'
import { registerName } from './nameFitter'

const cleanups: (() => void)[] = []
afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup())
  vi.unstubAllGlobals()
})

function browser() {
  const operations: string[] = []
  const callbacks = new Map<number, FrameRequestCallback>()
  let nextFrame = 0
  let resize: ResizeObserverCallback
  let ready: () => void = () => {}
  const fonts = new EventTarget()
  const window = new EventTarget()
  Object.assign(fonts, { ready: new Promise<void>(resolve => { ready = resolve }) })
  const observations = new Set<HTMLElement & { width: number }>()
  const observe = vi.fn((target: HTMLElement & { width: number }) => { observations.add(target) })
  const unobserve = vi.fn((target: HTMLElement & { width: number }) => { observations.delete(target) })
  const disconnect = vi.fn(() => observations.clear())
  const observer = { observe, unobserve, disconnect } as unknown as ResizeObserver
  const ResizeObserver = vi.fn(function (callback: ResizeObserverCallback) {
    resize = callback
    return observer
  })
  const measureText = vi.fn((text: string) => ({ width: text.length * 50 }))
  const styles = new Map<object, object>()
  const baseStyle = {
    paddingLeft: '0px', paddingRight: '0px', borderLeftWidth: '0px', borderRightWidth: '0px',
    fontStyle: 'normal', fontVariant: 'normal', fontWeight: '400', fontFamily: 'Instrument Serif',
    fontKerning: 'auto', fontStretch: 'normal', letterSpacing: 'normal',
    getPropertyValue: (key: string) => key === '--name-min-size' ? '18px' : '24px',
  }
  vi.stubGlobal('ResizeObserver', ResizeObserver)
  vi.stubGlobal('window', window)
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    callbacks.set(++nextFrame, callback)
    return nextFrame
  }))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id))
  vi.stubGlobal('getComputedStyle', (element: object) => {
    operations.push('read')
    return { ...baseStyle, ...styles.get(element) }
  })
  vi.stubGlobal('document', { fonts, createElement: () => ({ getContext: () => ({ measureText }) }) })
  function box(width = 150) {
    return {
      width,
      classList: { contains: () => false },
      getBoundingClientRect() { operations.push('read'); return { width: this.width } },
    } as unknown as HTMLElement & { width: number }
  }
  function name(text: string, parent = box()) {
    let size = ''
    const element = {
      parentElement: parent,
      children: [{ textContent: text }, { textContent: '.dusk' }],
      style: {
        getPropertyValue: () => size,
        setProperty: vi.fn((key: string, value: string) => {
          expect(key).toBe('--name-fit-size')
          operations.push('write')
          size = value
        }),
        removeProperty: vi.fn((key: string) => {
          expect(key).toBe('--name-fit-size')
          operations.push('write')
          size = ''
        }),
      },
    } as unknown as HTMLElement
    const cleanup = registerName(element, `${text}.dusk`)
    cleanups.push(cleanup)
    return element
  }
  function runFrame() {
    const pending = [...callbacks.values()]
    callbacks.clear()
    pending.forEach(callback => callback(nextFrame * 16))
    // Observing a box delivers its size even if the preceding write did not resize it.
    if (observations.size) notify(...observations)
  }
  function notify(...targets: ReturnType<typeof box>[]) {
    targets.forEach(target => observations.delete(target))
    resize(targets.map(target => ({ target, contentRect: { width: target.width } })) as ResizeObserverEntry[], observer)
  }
  return { operations, callbacks, fonts, window, ready, ResizeObserver, observe, unobserve, disconnect, measureText, styles, box, name, runFrame, notify }
}

it('coalesces 100 names and repeated notifications into one frame, reads before writes, and skips unchanged widths', () => {
  const b = browser()
  const boxes = Array.from({ length: 100 }, () => b.box(120))
  const elements = boxes.map((box, index) => b.name(`name${index}`, box))
  b.notify(...boxes)
  b.notify(...boxes)
  expect(b.ResizeObserver).toHaveBeenCalledTimes(1)
  expect(b.observe.mock.calls.map(([target]) => target)).toEqual(boxes)
  expect(b.callbacks.size).toBe(1)
  expect(b.measureText).not.toHaveBeenCalled()
  b.runFrame()
  expect(b.measureText).toHaveBeenCalledTimes(101) // Each label once, and one shared suffix.
  expect(b.operations.slice(b.operations.indexOf('write'))).not.toContain('read')
  const initialReads = b.operations.length
  b.notify(...boxes)
  b.notify(...boxes)
  expect(b.callbacks.size).toBe(0)
  expect(b.operations).toHaveLength(initialReads)

  boxes.forEach(box => { box.width = 110 })
  b.notify(...boxes)
  b.notify(...boxes)
  expect(b.callbacks.size).toBe(1)
  b.operations.length = 0
  b.runFrame()
  expect(b.measureText).toHaveBeenCalledTimes(101)
  expect(b.operations.slice(b.operations.indexOf('write'))).not.toContain('read')
  elements.forEach(element => expect(element.style.setProperty).toHaveBeenCalledTimes(2))
  b.notify(...boxes)
  expect(b.callbacks.size).toBe(0)
})

it('scales once, clamps to the readable minimum, and restores the maximum as space returns', () => {
  const b = browser()
  const box = b.box(120)
  const element = b.name('aurora', box)
  b.runFrame()
  expect(parseFloat(element.style.getPropertyValue('--name-fit-size'))).toBeCloseTo(100 * 119 * 0.98 / 550)
  box.width = 90
  b.notify(box)
  b.runFrame()
  expect(element.style.getPropertyValue('--name-fit-size')).toBe('18px')
  box.width = 400
  b.notify(box)
  b.runFrame()
  expect(element.style.getPropertyValue('--name-fit-size')).toBe('')
  expect(element.style.removeProperty).toHaveBeenCalledOnce()
  expect(b.measureText).toHaveBeenCalledTimes(2)
})

it('absorbs its own content-sized box resizes and writes once per external change', () => {
  const b = browser()
  let scale = 1
  const box = b.box(132)
  const element = b.name('aurora', box)
  Object.defineProperty(box, 'width', { get: () => scale * 5.5 * (parseFloat(element.style.getPropertyValue('--name-fit-size')) || 24) })
  const writes = () => vi.mocked(element.style.setProperty).mock.calls.length + vi.mocked(element.style.removeProperty).mock.calls.length
  const settle = () => {
    for (let i = 0; i < 50; i++) {
      b.notify(box)
      b.runFrame()
    }
    expect(b.callbacks.size).toBe(0)
  }

  b.runFrame()
  const firstSize = element.style.getPropertyValue('--name-fit-size')
  settle()
  expect(writes()).toBe(1)
  expect(element.style.getPropertyValue('--name-fit-size')).toBe(firstSize)

  // A different box must not refit this name using its post-write width.
  const otherBox = b.box(120)
  b.name('another', otherBox)
  b.runFrame()
  b.notify(otherBox)
  settle()
  expect(writes()).toBe(1)

  scale = 0.95
  b.notify(box)
  b.notify(box)
  expect(b.callbacks.size).toBe(1)
  b.runFrame()
  settle()
  expect(writes()).toBe(2)
  expect(parseFloat(element.style.getPropertyValue('--name-fit-size'))).toBeLessThan(parseFloat(firstSize))

  b.fonts.dispatchEvent(new Event('loadingdone'))
  b.runFrame()
  settle()
  expect(writes()).toBe(3)

  scale = 2
  b.window.dispatchEvent(new Event('resize'))
  b.runFrame()
  settle()
  expect(writes()).toBe(4)
  expect(element.style.getPropertyValue('--name-fit-size')).toBe('')
})

it('invalidates font measurements once for ready/loadingdone and distinguishes changed names and fonts at the same width', async () => {
  const b = browser()
  const box = b.box()
  const first = b.name('aurora', box)
  b.runFrame()
  b.ready()
  b.fonts.dispatchEvent(new Event('loadingdone'))
  b.fonts.dispatchEvent(new Event('loadingdone'))
  await Promise.resolve()
  expect(b.callbacks.size).toBe(1)
  b.runFrame()
  expect(b.measureText).toHaveBeenCalledTimes(4)
  b.styles.set(first.children[0], { fontWeight: '700' })
  b.name('another', box)
  b.runFrame()
  expect(b.measureText).toHaveBeenCalledTimes(6)
  expect(b.observe).toHaveBeenCalledTimes(1)
  const calls = b.measureText.mock.calls.length
  b.name('another', box)
  b.runFrame()
  expect(b.measureText).toHaveBeenCalledTimes(calls)
  expect(first.style.setProperty).not.toHaveBeenCalled()
})

it('refits on viewport changes when the maximum changes at a fixed container width, without storing the maximum', () => {
  const b = browser()
  const box = b.box(220)
  const element = b.name('aurora', box)
  let maximum = '38.4px'
  b.styles.set(element, { getPropertyValue: (key: string) => key === '--name-min-size' ? '24px' : maximum })
  b.runFrame()
  expect(element.style.setProperty).not.toHaveBeenCalled()
  maximum = '43.2px'
  b.window.dispatchEvent(new Event('resize'))
  b.window.dispatchEvent(new Event('resize'))
  expect(b.callbacks.size).toBe(1)
  b.runFrame()
  expect(parseFloat(element.style.getPropertyValue('--name-fit-size'))).toBeCloseTo(100 * 219 * 0.98 / 550)
  b.window.dispatchEvent(new Event('resize'))
  b.runFrame()
  expect(element.style.setProperty).toHaveBeenCalledOnce()
  maximum = '38.4px'
  b.window.dispatchEvent(new Event('resize'))
  b.runFrame()
  expect(element.style.getPropertyValue('--name-fit-size')).toBe('')
  expect(element.style.removeProperty).toHaveBeenCalledOnce()
  expect(b.measureText).toHaveBeenCalledTimes(2)
})

it('subtracts container padding and releases shared observers, viewport listeners and pending work', async () => {
  const b = browser()
  const box = b.box(140)
  b.styles.set(box, { paddingLeft: '10px', paddingRight: '10px' })
  const element = b.name('aurora', box)
  b.name('another', box)
  expect(b.observe).toHaveBeenCalledExactlyOnceWith(box)
  b.runFrame()
  expect(parseFloat(element.style.getPropertyValue('--name-fit-size'))).toBeCloseTo(100 * 119 * 0.98 / 550)
  b.unobserve.mockClear()
  cleanups.shift()!()
  expect(b.unobserve).not.toHaveBeenCalled()
  box.width = 100
  b.notify(box)
  cleanups.shift()!()
  expect(b.unobserve).toHaveBeenCalledExactlyOnceWith(box)
  expect(b.disconnect).toHaveBeenCalledOnce()
  b.ready()
  b.fonts.dispatchEvent(new Event('loadingdone'))
  b.window.dispatchEvent(new Event('resize'))
  await Promise.resolve()
  expect(b.callbacks.size).toBe(0)
})
