import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { SubdomainList } from './SubdomainList'
import { SubdomainCreatePanel } from './SubdomainCreatePanel'

const noop = () => {}

it('offers manager assignment and both expiry policies without revocation or delegation controls', () => {
  const markup = renderToStaticMarkup(<SubdomainCreatePanel
    displayName="acme.dusk"
    parentExpiryDay="2040-06-17"
    subdomainPreview="pay.acme.dusk"
    creation={{ canCreateSubname: true, onCreateSubname: noop, onSubnameExpiryDateChange: noop, onSubnameExpiryPolicyChange: noop, onSubnameLabelChange: noop, onSubnameManagerChange: noop, subnameExpiryDate: "", subnameExpiryPolicy: "inherits_parent", subnameLabel: "pay", subnameManager: "owner" }}
    authority={{ selectedAuthority: "owner" }}
  />)
  expect(markup).toContain('Reserved words are allowed in subnames.')
  expect(markup).toContain('Manager')
  expect(markup).toContain('Inherit parent expiry')
  expect(markup).toContain('Fixed before parent expiry')
  expect(markup).not.toMatch(/revocation|revoke|locked after creation|delegate/i)
})

it('shows expiry and manager without revocation copy on existing subdomains', () => {
  const markup = renderToStaticMarkup(<SubdomainList onRecordTargetSelect={noop}
    subnames={[{
      parentName: 'acme.dusk', parentNode: 'parent', label: 'pay', name: 'pay.acme.dusk', node: 'child',
      owner: 'owner', manager: 'manager', resolver: '', expiresAt: 1000, parentExpiresAt: 1000,
      expiryPolicy: 'inherits_parent', createdAt: 10, status: 'active',
    }]}
    authority={{ selectedAuthority: "owner" }}
    clock={{ currentBlockHeight: 100, nowSeconds: 1_790_000_000 }} />)
  expect(markup).toContain('Inherits parent expiry')
  expect(markup).toContain('manager')
  expect(markup).not.toMatch(/revocation|revoke|locked after creation|delegate/i)
})
