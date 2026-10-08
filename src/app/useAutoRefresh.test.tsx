// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAutoRefresh } from './useAutoRefresh'

let root: Root
const refresh = vi.fn()
function Reader({ scope, enabled = true }: { scope: string, enabled?: boolean }) {
  useAutoRefresh(refresh, enabled, 30_000, scope)
  return null
}
const render = (scope: string, enabled = true) => act(async () => root.render(<Reader scope={scope} enabled={enabled} />))

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  refresh.mockReset()
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root')!)
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals() })

it('reads again at once when the scope changes, such as a wallet session restoring', async () => {
  await render('')
  expect(refresh).not.toHaveBeenCalled()
  await render('wallet-a')
  expect(refresh).toHaveBeenCalledOnce()
  await render('wallet-a')
  expect(refresh).toHaveBeenCalledOnce()
})

it('leaves a disabled reader alone when the scope changes', async () => {
  await render('', false)
  await render('wallet-a', false)
  expect(refresh).not.toHaveBeenCalled()
})
