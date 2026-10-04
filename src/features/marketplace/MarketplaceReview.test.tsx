// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { MarketplaceReview } from './MarketplaceReview'

it('requires fresh namespace acknowledgement for each review with descendants', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div')
  const root = createRoot(container)
  document.body.append(container)
  const onConfirm = vi.fn()
  const review = { title: 'Transfer example.dusk', rows: [], note: 'Transfer ownership.', transfersNamespace: true, namespace: { descendantCount: 2, heldByOthersCount: 1 } }
  const render = (value: typeof review) => root.render(<MarketplaceReview review={value} disabled={false} onClose={() => {}} onConfirm={onConfirm} />)
  const confirm = () => Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Confirm in wallet')!
  try {
    await act(async () => { render(review) })
    expect(confirm().disabled).toBe(true)
    expect(document.body.textContent).toContain('Includes 2 subnames · 1 held by others')
    await act(async () => { document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click() })
    expect(confirm().disabled).toBe(false)
    await act(async () => { confirm().click() })
    expect(onConfirm).toHaveBeenCalledOnce()
    await act(async () => { render({ ...review }) })
    expect(confirm().disabled).toBe(true)
    await act(async () => { render({ ...review, namespace: { descendantCount: 0, heldByOthersCount: 0 } }) })
    expect(document.querySelector('input[type="checkbox"]')).toBeNull()
    expect(confirm().disabled).toBe(false)
  } finally {
    await act(async () => { root.unmount() })
    container.remove()
    vi.unstubAllGlobals()
  }
})
