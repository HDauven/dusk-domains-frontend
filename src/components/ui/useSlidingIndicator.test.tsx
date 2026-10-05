// @vitest-environment happy-dom
import { act, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { Tabs } from './Tabs'

type Item = { id: string, label: string }
const items: Item[] = [{ id: 'profile', label: 'Profile' }, { id: 'activity', label: 'Activity' }]
const nextFrame = () => act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)) })

async function mount(element: ReactNode) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => { root.render(element) })
  return {
    list: () => container.querySelector<HTMLElement>('[role="tablist"]')!,
    render: (next: ReactNode) => act(async () => { root.render(next) }),
    unmount: async () => { await act(async () => { root.unmount() }); container.remove() },
  }
}

afterEach(() => { vi.unstubAllGlobals() })

it('places the indicator under the selected tab, then lets later moves slide', async () => {
  const view = await mount(<Tabs id="t" label="Sections" items={items} value="profile" onChange={() => {}} />)
  try {
    // The first placement is not animated; the next frame marks it ready to slide.
    expect(view.list().dataset.indicator).toBeDefined()
    await nextFrame()
    expect(view.list().dataset.indicator).toBe('ready')
    expect(view.list().style.getPropertyValue('--indicator-width')).toMatch(/px$/)
    await view.render(<Tabs id="t" label="Sections" items={items} value="activity" onChange={() => {}} />)
    expect(view.list().dataset.indicator).toBe('ready')
    await view.render(<Tabs id="t" label="Sections" items={items} value="none" onChange={() => {}} />)
    expect(view.list().dataset.indicator).toBeUndefined()
  } finally {
    await view.unmount()
  }
})

it('becomes ready to slide under Strict Mode, which sets effects up twice', async () => {
  const view = await mount(<StrictMode><Tabs id="t" label="Sections" items={items} value="profile" onChange={() => {}} /></StrictMode>)
  try {
    await nextFrame()
    expect(view.list().dataset.indicator).toBe('ready')
  } finally {
    await view.unmount()
  }
})

it('follows the selected item when an item is inserted before it', async () => {
  // happy-dom has no layout: give each tab a width of 100 px and place it by its index.
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
    return this.parentElement ? [...this.parentElement.children].indexOf(this) * 100 : 0
  })
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100)
  const view = await mount(<Tabs id="t" label="Sections" items={items} value="activity" onChange={() => {}} />)
  try {
    expect(view.list().style.getPropertyValue('--indicator-x')).toBe('100px')
    await view.render(<Tabs id="t" label="Sections" items={[{ id: 'records', label: 'Records' }, ...items]} value="activity" onChange={() => {}} />)
    await nextFrame()
    expect(view.list().style.getPropertyValue('--indicator-x')).toBe('200px')
  } finally {
    vi.restoreAllMocks()
    await view.unmount()
  }
})
