// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { contractPrincipalFromWalletAccount } from '../../../names/internal'
import { SubdomainCreatePanel } from './SubdomainCreatePanel'

const manager = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'
let root: Root
const onCreateSubname = vi.fn()

const onSubnameManagerChange = vi.fn()
function render(subnameManager: string, selectedAuthority = 'sam', canCreateSubname = true) {
  const noop = () => {}
  return act(async () => root.render(<SubdomainCreatePanel displayName="nightowlshq.dusk" parentExpiryDay="2027-10-11" subdomainPreview="maya.nightowlshq.dusk"
    creation={{ canCreateSubname, onCreateSubname, onSubnameExpiryDateChange: noop, onSubnameExpiryPolicyChange: noop, onSubnameLabelChange: noop,
      onSubnameManagerChange, subnameExpiryDate: '', subnameExpiryPolicy: 'inherits_parent', subnameLabel: 'maya', subnameManager }}
    authority={{ selectedAuthority }} />))
}
// Types into a controlled field the way a person does, so React sees the change.
function type(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
const button = (name: string) => [...document.querySelectorAll('button')].find(item => item.textContent === name)

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  onCreateSubname.mockClear()
  onSubnameManagerChange.mockClear()
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root')!)
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals() })

it('shows the manager address in a review step before the wallet opens', async () => {
  await render(manager)
  await act(async () => button('Create subname')!.click())
  expect(onCreateSubname).not.toHaveBeenCalled()
  const review = document.querySelector('[aria-label="Review maya.nightowlshq.dusk"]')!
  // The name is on screen, and focus moves to the review.
  expect(review.textContent).toContain('maya.nightowlshq.dusk')
  expect(review.contains(document.activeElement)).toBe(true)
  expect(review.textContent).toContain('Owner')
  expect(review.textContent).toContain('You')
  // The whole address, so it can be checked character by character.
  expect(review.querySelector('code')?.textContent).toBe(manager)
  await act(async () => button('Edit')!.click())
  expect(document.querySelector('[aria-label="Review maya.nightowlshq.dusk"]')).toBeNull()
  expect(document.activeElement).toBe(button('Create subname'))
  expect(onCreateSubname).not.toHaveBeenCalled()
  await act(async () => button('Create subname')!.click())
  await act(async () => button('Create in wallet')!.click())
  expect(onCreateSubname).toHaveBeenCalledOnce()
})

it.each(['', 'sam'])('creates a subname you manage yourself without a review step: %j', async subnameManager => {
  await render(subnameManager)
  await act(async () => button('Create subname')!.click())
  expect(onCreateSubname).toHaveBeenCalledOnce()
  expect(document.querySelector('[aria-label="Review maya.nightowlshq.dusk"]')).toBeNull()
})

it('treats your own Dusk address as managing it yourself', async () => {
  const parsed = contractPrincipalFromWalletAccount(manager)
  if (!parsed.ok) throw new Error('Invalid fixture')
  await render(manager, parsed.principal)
  await act(async () => button('Create subname')!.click())
  expect(onCreateSubname).toHaveBeenCalledOnce()
})

it('closes the review when the manager is edited, and never takes focus from the field while typing', async () => {
  await render(manager)
  await act(async () => button('Create subname')!.click())
  const details = document.querySelector('details') as HTMLDetailsElement
  details.open = true
  const field = document.getElementById('subname-manager') as HTMLInputElement
  field.focus()
  // Clear the address, then type another one, one change at a time.
  await act(async () => type(field, ''))
  expect(onSubnameManagerChange).toHaveBeenLastCalledWith('')
  await render('')
  await act(async () => type(field, '2'))
  await render('2')
  await render(manager.slice(0, -1))
  await render(manager)
  expect(document.querySelector('[aria-label="Review maya.nightowlshq.dusk"]')).toBeNull()
  expect(document.activeElement).toBe(field)
  // Create subname reviews the new address.
  await act(async () => button('Create subname')!.click())
  expect(document.querySelector('[aria-label="Review maya.nightowlshq.dusk"]')).not.toBeNull()
})

it('puts focus back on the form after the wallet opens or an edit', async () => {
  await render(manager)
  await act(async () => button('Create subname')!.click())
  await act(async () => button('Create in wallet')!.click())
  expect(onCreateSubname).toHaveBeenCalledOnce()
  expect(document.activeElement).toBe(button('Create subname'))
  // While Create subname can't be used, Edit goes to the label instead.
  await act(async () => button('Create subname')!.click())
  await render(manager, 'sam', false)
  await act(async () => button('Edit')!.click())
  expect(document.activeElement).toBe(document.getElementById('subname-label'))
})

it('never leaves Create subname disabled when the manager is cleared during review', async () => {
  await render(manager)
  await act(async () => button('Create subname')!.click())
  expect(button('Create subname')!.disabled).toBe(true)
  await render('')
  expect(document.querySelector('[aria-label="Review maya.nightowlshq.dusk"]')).toBeNull()
  expect(button('Create subname')!.disabled).toBe(false)
})
