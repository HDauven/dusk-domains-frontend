// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AppMainContent } from './AppMainContent'
import { RootErrorBoundary } from '../components/status/ViewErrorBoundary'

let root: Root, host: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  // React reports a caught render error to the console; keep the test output readable.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  host = document.createElement('div')
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// A treasury view whose data can't be rendered, such as a value past the display range.
const broken = { treasuryState: undefined } as never
const content = (mainView: 'treasury' | 'terms') => <AppMainContent mainView={mainView}
  ownershipConfirmationProps={{ pending: [], onRetry: vi.fn() }} treasuryProps={broken}
  developersProps={undefined} marketplaceProps={{} as never} myDomainsProps={{} as never} referralsProps={{} as never} searchProps={{} as never} />

it('keeps the rest of the app when one view fails to render, and recovers on the next view', async () => {
  await act(async () => root.render(<main><nav>Navigation</nav>{content('treasury')}<footer>Footer</footer></main>))
  expect(host.textContent).toContain('Navigation')
  expect(host.textContent).toContain('Footer')
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('This page couldn’t be shown.')
  await act(async () => root.render(<main><nav>Navigation</nav>{content('terms')}<footer>Footer</footer></main>))
  expect(host.querySelector('[role="alert"]')).toBeNull()
  expect(host.textContent).toContain('Terms of Use')
})

it('shows a way back instead of a blank page when the whole app fails to render', async () => {
  function App(): never { throw new RangeError('Registration quote exceeds the maximum.') }
  await act(async () => root.render(<RootErrorBoundary><App /></RootErrorBoundary>))
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Dusk Domains couldn’t load this page.')
  expect([...host.querySelectorAll('button')].map(button => button.textContent)).toContain('Reload')
  // Nothing about the failure's internals reaches the page.
  expect(host.textContent).not.toContain('Registration quote exceeds')
})
