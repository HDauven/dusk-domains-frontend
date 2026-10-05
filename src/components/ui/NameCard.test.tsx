// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { NameCard } from './NameCard'

// Name fitting measures layout, which happy-dom does not provide.
vi.mock('./nameFitter', () => ({ registerName: () => () => {} }))

it('keeps a clickable card\'s warnings in its accessible description', () => {
  const html = renderToStaticMarkup(<NameCard name="aurora.dusk" onOpen={() => {}}><span>Pays another wallet</span></NameCard>)
  const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1]
  expect(describedBy).toBeTruthy()
  expect(html).toMatch(new RegExp(`id="${describedBy}"[^>]*>[\\s\\S]*Pays another wallet`))
})

it('drops an avatar that fails to load and tries a different one', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => { root.render(<NameCard name="pieswap.dusk" avatar="https://example.com/gone.jpg" />) })
    await act(async () => { container.querySelector('img.name-avatar')!.dispatchEvent(new Event('error')) })
    expect(container.querySelector('img.name-avatar')).toBeNull()
    await act(async () => { root.render(<NameCard name="pie.dusk" avatar="https://example.com/pie.jpg" />) })
    expect(container.querySelector('img.name-avatar')?.getAttribute('src')).toBe('https://example.com/pie.jpg')
  } finally {
    await act(async () => { root.unmount() })
    container.remove()
  }
})
