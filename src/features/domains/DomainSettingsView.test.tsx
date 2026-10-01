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

it('offers renewal through grace and explains the deadline and old-expiry basis', () => {
  const active = settings({})
  expect(active).toContain('Renewal term')
  expect(active).toContain(`Runs until ${day(20_000)}. You can renew until ${day(300_000)}; after that anyone can register it.`)
  expect(active).toContain('Renewal extends from the previous expiry.')
  for (const currentBlockHeight of [20_000, 20_001, 299_999]) {
    const expired = settings({ currentBlockHeight })
    expect(expired).toContain('Renewal term')
    expect(expired).toContain('DUSK')
    expect(expired).toContain(`Renew by ${formatLifecycleDay(300_000, currentBlockHeight, nowSeconds)} to keep it.`)
    expect(expired).toContain('Renewal extends from the previous expiry.')
    expect(expired).toMatch(/<button class="primary-button compact" type="button">Renew<\/button>/)
  }
  for (const currentBlockHeight of [300_000, 300_001]) {
    const released = settings({ currentBlockHeight })
    expect(released).not.toContain('Renewal term')
    expect(released).not.toContain('DUSK')
    expect(released).toContain('Anyone can register it now.')
  }
})

it('uses the derived grace end for renewal controls and copy when grace is unknown', () => {
  for (const currentBlockHeight of [1_000, 20_000, 20_001, 279_199, 279_200]) {
    const markup = settings({ currentBlockHeight, managedName: { ...managedName, graceEndsAt: 0 } })
    const grace = formatLifecycleDay(279_200, currentBlockHeight, nowSeconds)
    if (currentBlockHeight < 279_200) {
      expect(markup).toContain('Renewal term')
      expect(markup).toContain(currentBlockHeight < 20_000 ? `You can renew until ${grace}` : `Renew by ${grace} to keep it.`)
    } else {
      expect(markup).not.toContain('Renewal term')
      expect(markup).toContain('Anyone can register it now.')
    }
  }
})

it.each([0, 1_802_592_000])('uses the estimate margin for renewal controls and copy with grace end %s', (graceEndsAt) => {
  const name = { ...managedName, expiresAt: 1_800_000_000, graceEndsAt }
  const open = settings({ managedName: name, nowSeconds: 1_802_588_399 })
  expect(open).toContain('Renewal term')
  expect(open).toContain(`Renew by ${formatLifecycleDay(1_802_588_400, null, 0)} to keep it.`)
  expect(open).toContain('Renewal closes one hour before the estimated grace end.')
  for (const nowSeconds of [1_802_588_400, 1_802_591_999, 1_802_592_000]) {
    const closed = settings({ managedName: name, nowSeconds })
    expect(closed).not.toContain('Renewal term')
    expect(closed).toContain('Renewal is closed near the estimated grace end.')
    expect(closed).not.toContain('Anyone can register it now.')
  }
})
