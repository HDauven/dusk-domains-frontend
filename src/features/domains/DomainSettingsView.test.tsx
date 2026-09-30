import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { formatLifecycleDay } from './domainFormat'
import { DomainSettingsView, type DomainSettingsViewProps } from './DomainSettingsView'

const noop = () => {}
const nowSeconds = 1_790_000_000
const managedName = { owner: 'owner', manager: 'owner', resolver: 'resolver', expiresAt: 20_000, graceEndsAt: 300_000, expiryPolicy: null }
const day = (height: number) => formatLifecycleDay(height, 1_000, nowSeconds)

function settings(overrides: Partial<DomainSettingsViewProps>) {
  const props: DomainSettingsViewProps = {
    canManageName: false, canRenewName: true, confirmationInput: '', currentBlockHeight: 1_000,
    displayName: 'alphavnuc.dusk', draftManager: 'owner', draftOwner: 'owner', feeConfigError: '',
    feeConfigLoading: false, managedName, managementError: '', managementTxState: null, maxDurationYears: 10,
    minDurationYears: 1, nowSeconds, onConfirmationInputChange: noop, onDraftManagerChange: noop,
    onDraftOwnerChange: noop, onOwnershipUpdate: noop, onRenewName: noop, onRenewalYearsChange: noop,
    renewalBusy: false, renewalError: '', renewalFee: 10, renewalPreviewExpiresAt: 40_000,
    renewalTxState: null, renewalYears: 1, ...overrides,
  }
  return renderToStaticMarkup(<DomainSettingsView {...props} />).replaceAll('&#x27;', '\'')
}

it('offers a subname no renewal and says how its expiry works', () => {
  const inherits = settings({ displayName: 'pay.alphavnuc.dusk', managedName: { ...managedName, expiryPolicy: 'inherits_parent' } })
  expect(inherits).not.toContain('Renewal controls')
  expect(inherits).not.toContain('Renewal term')
  expect(inherits).not.toContain('DUSK')
  expect(inherits).toContain(`Runs until ${day(20_000)}. It expires with alphavnuc.dusk, and renewing alphavnuc.dusk renews it too.`)
  // A deeper subname's parent is a subname too, and cannot be renewed.
  const nested = settings({ displayName: 'pay.team.example.dusk', managedName: { ...managedName, expiryPolicy: 'inherits_parent' } })
  expect(nested).not.toContain('Renewal term')
  expect(nested).toContain(`Runs until ${day(20_000)}. It expires with team.example.dusk.</p>`)
  expect(nested).not.toContain('renewing')
  const fixed = settings({ displayName: 'pay.alphavnuc.dusk', managedName: { ...managedName, expiryPolicy: 'fixed_before_parent' } })
  expect(fixed).not.toContain('Renewal term')
  expect(fixed).toContain('This date was fixed when it was created and can\'t be extended.')
  expect(settings({ displayName: 'pay.alphavnuc.dusk' })).toContain('Subnames can\'t be renewed on their own.')
})

it('asks for renewal before expiry, and offers none once the name has expired', () => {
  const active = settings({})
  expect(active).toContain('Renewal term')
  expect(active).toContain(`Runs until ${day(20_000)}. Renew it before then. After that it can't be renewed; it is held until ${day(300_000)}, then anyone can register it.`)
  expect(active).not.toContain('only its owner')
  // No grace end from the index: no grace date at all.
  expect(settings({ managedName: { ...managedName, graceEndsAt: 0 } }))
    .toContain(`Runs until ${day(20_000)}. Renew it before then. After that it can't be renewed.</p>`)

  const expired = settings({ currentBlockHeight: 20_000 })
  expect(expired).not.toContain('Renewal term')
  expect(expired).not.toContain('DUSK')
  expect(expired).toContain('so it can\'t be renewed. It is held until')
  expect(settings({ currentBlockHeight: 300_000 })).toContain('so it can\'t be renewed. Anyone can register it now.')
})
