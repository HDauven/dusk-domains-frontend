// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { SubnameAuthorityControls } from './SubnameAuthorityControls'

afterEach(() => vi.unstubAllGlobals())

it('asks before taking back a subname and says what happens to it', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const onTakeBack = vi.fn(async () => {})
  const host = document.createElement('div')
  const root = createRoot(host)
  await act(async () => root.render(<SubnameAuthorityControls name="maya.nightowls.dusk" onReassign={vi.fn()} onRemove={vi.fn()} onTakeBack={onTakeBack} />))
  const button = (label: string) => [...host.querySelectorAll('button')].find(item => item.textContent === label)!
  await act(async () => button('Take back').click())
  expect(onTakeBack).not.toHaveBeenCalled()
  expect(host.textContent).toContain('Take back maya.nightowls.dusk? Its records and primary name are cleared, and its current owner and manager lose it. You become its owner and manager.')
  await act(async () => button('Cancel').click())
  expect(host.textContent).not.toContain('Take back maya.nightowls.dusk?')
  expect(onTakeBack).not.toHaveBeenCalled()
  await act(async () => button('Take back').click())
  await act(async () => button('Take back name').click())
  expect(onTakeBack).toHaveBeenCalledOnce()
  await act(async () => root.unmount())
})
