import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { formatLifecycleDay } from './domainFormat'
import { userFacingErrorMessage } from '../../names/internal'
import { DomainSettingsView, type DomainSettingsViewProps } from './DomainSettingsView'

const noop = () => {}
const nowSeconds = 1_790_000_000
const managedName = { node: 'node', owner: 'owner', manager: 'owner', resolver: 'resolver', expiresAt: 20_000, graceEndsAt: 300_000, expiryPolicy: null }
const day = (height: number) => formatLifecycleDay(height, 1_000, nowSeconds)

function settings(overrides: Partial<Omit<DomainSettingsViewProps, 'clock'>> & { clock?: Partial<DomainSettingsViewProps['clock']> }) {
  const props: DomainSettingsViewProps = {
    displayName: 'alphavnuc.dusk',
    managedName,
    ...overrides,
    ownership: {
      canManageName: false,
      confirmationInput: '',
      managementError: '',
      managementTxState: null,
      onConfirmationInputChange: noop,
      onOwnershipUpdate: async () => undefined,
      ...overrides.ownership,
    },
    renewal: {
      canRenewName: true,
      feeConfigError: '',
      feeConfigLoading: false,
      maxDurationYears: 10,
      minDurationYears: 1,
      onRenewName: noop,
      onRenewalYearsChange: noop,
      renewalBusy: false,
      renewalError: '',
      renewalFee: 10,
      renewalPreviewExpiresAt: 40_000,
      renewalTxState: null,
      renewalYears: 1,
      ...overrides.renewal,
    },
    clock: {
      currentBlockHeight: 1_000,
      nowSeconds,
      ...overrides.clock,
    },
  }
  return renderToStaticMarkup(<DomainSettingsView {...props} />).replaceAll('&#x27;', '\'')
}

it('offers a subname no renewal and says how its expiry works', () => {
  const inherits = settings({ displayName: 'pay.alphavnuc.dusk', managedName: { ...managedName, expiryPolicy: 'inherits_parent' } })
  expect(inherits).not.toContain('Renewal controls')
  expect(inherits).not.toContain('Renewal term')
  expect(inherits).not.toContain('DUSK')
  expect(inherits).toContain(`Expires ${day(20_000)}. It expires with alphavnuc.dusk, and renewing alphavnuc.dusk renews it too.`)
  // A deeper subname's parent is a subname too, and cannot be renewed.
  const nested = settings({ displayName: 'pay.team.example.dusk', managedName: { ...managedName, expiryPolicy: 'inherits_parent' } })
  expect(nested).not.toContain('Renewal term')
  expect(nested).toContain(`Expires ${day(20_000)}. It expires with team.example.dusk.</p>`)
  expect(nested).not.toContain('renewing')
  const fixed = settings({ displayName: 'pay.alphavnuc.dusk', managedName: { ...managedName, expiryPolicy: 'fixed_before_parent' } })
  expect(fixed).not.toContain('Renewal term')
  expect(fixed).toContain('This date was fixed when it was created and can\'t be extended.')
  expect(settings({ displayName: 'pay.alphavnuc.dusk' })).toContain('Subnames can\'t be renewed on their own.')
})

it('offers renewal through grace and explains the deadline and old-expiry basis', () => {
  const active = settings({})
  expect(active).toContain('Renewal term')
  expect(active).toContain(`Expires ${day(20_000)}. Nothing renews automatically: you can renew it until ${day(300_000)}, and after that anyone can register it.`)
  expect(active).toContain('Renewal extends from the previous expiry.')
  for (const currentBlockHeight of [20_000, 20_001, 299_999]) {
    const expired = settings({
      clock: {
        currentBlockHeight,
      },
    })
    expect(expired).toContain('Renewal term')
    expect(expired).toContain('DUSK')
    expect(expired).toContain(`Renew by ${formatLifecycleDay(300_000, currentBlockHeight, nowSeconds)} to keep it.`)
    expect(expired).toContain('Renewal extends from the previous expiry.')
    expect(expired).toMatch(/<button(?![^>]*disabled)[^>]*>Renew<\/button>/)
  }
  for (const currentBlockHeight of [300_000, 300_001]) {
    const released = settings({
      clock: {
        currentBlockHeight,
      },
    })
    expect(released).not.toContain('Renewal term')
    expect(released).not.toContain('DUSK')
    expect(released).toContain('Anyone can register it now.')
  }
})

it('uses the derived grace end for renewal controls and copy when grace is unknown', () => {
  for (const currentBlockHeight of [1_000, 20_000, 20_001, 279_199, 279_200]) {
    const markup = settings({
      managedName: { ...managedName, graceEndsAt: 0 },
      clock: {
        currentBlockHeight,
      },
    })
    const grace = formatLifecycleDay(279_200, currentBlockHeight, nowSeconds)
    if (currentBlockHeight < 279_200) {
      expect(markup).toContain('Renewal term')
      expect(markup).toContain(currentBlockHeight < 20_000 ? `you can renew it until ${grace}` : `Renew by ${grace} to keep it.`)
    } else {
      expect(markup).not.toContain('Renewal term')
      expect(markup).toContain('Anyone can register it now.')
    }
  }
})

it.each([0, 1_802_592_000])('uses the estimate margin for renewal controls and copy with grace end %s', (graceEndsAt) => {
  const name = { ...managedName, expiresAt: 1_800_000_000, graceEndsAt }
  const open = settings({
    managedName: name,
    clock: {
      nowSeconds: 1_802_588_399,
    },
  })
  expect(open).toContain('Renewal term')
  expect(open).toContain(`Renew by ${formatLifecycleDay(1_802_588_400, null, 0)} to keep it.`)
  expect(open).toContain('Renewal closes one hour before the estimated grace end.')
  for (const nowSeconds of [1_802_588_400, 1_802_591_999, 1_802_592_000]) {
    const closed = settings({
      managedName: name,
      clock: {
        nowSeconds,
      },
    })
    expect(closed).not.toContain('Renewal term')
    expect(closed).toContain('Renewal is closed near the estimated grace end.')
    expect(closed).not.toContain('Anyone can register it now.')
  }
})

it('links List for sale to the current name in the Sell tab', () => {
  expect(settings({})).toContain('href="/market/sell/alphavnuc.dusk"')
})

it('offers renewal for a listed name and says the listing stays as it is', () => {
  const html = settings({ managedName: { ...managedName, ownerIsContract: true, inMarketplaceEscrow: true } })
  expect(html).toContain('Renewal controls')
  expect(html).toContain('Renewing it doesn’t change the listing: the name stays listed at the same price, until the same end date.')
  expect(html).not.toContain('after the listing closes')
})

it('offers renewal for a contract-held name before its custody is known', () => {
  const html = settings({ managedName: { ...managedName, ownerIsContract: true, inMarketplaceEscrow: null } })
  expect(html).toContain('Renewal controls')
  expect(html).not.toContain('custody can be checked')
  expect(html).not.toContain('doesn’t change the listing')
})

it('shows website verification setup only to the owner', () => {
  expect(settings({})).toContain('Verify your website')
  expect(settings({ isOwner: false })).not.toContain('Verify your website')
})

const YEAR = 3_153_600
it.each([
  [3, 7],
  [9, 1],
])('offers only renewal terms that stay within ten years ahead: %i years left allow %i more', (left, more) => {
  const html = settings({ managedName: { ...managedName, expiresAt: 1_000 + left * YEAR, graceEndsAt: 1_000 + left * YEAR + 259_200 } })
  const terms = [...html.matchAll(/aria-pressed="(?:true|false)"[^>]*>(\d+) years?</g)].map(match => Number(match[1]))
  expect(Math.max(...terms)).toBe(more)
  expect(terms.every(years => years <= more)).toBe(true)
  expect(html).toContain(`A name can run at most 10 years ahead, so you can add up to ${more} ${more === 1 ? 'year' : 'years'} now.`)
})

it('explains when a name is already at the ten-year limit and offers no term', () => {
  const html = settings({ managedName: { ...managedName, expiresAt: 1_000 + 10 * YEAR - 10, graceEndsAt: 1_000 + 10 * YEAR + 259_190 } })
  expect(html).not.toContain('Renewal term')
  expect(html).not.toMatch(/>Renew<\/button>/)
  expect(html).toContain(`It already runs close to the 10-year limit. You can add another year from ${day(1_000 + 10 * YEAR - 10 + YEAR - 10 * YEAR)}.`)
})

it('never shows a raw contract read error for a renewal price', () => {
  const html = settings({ renewal: { feeConfigError: 'Contract read failed (7fe6b9783ab40773f9f8adb9c8aa1b55b83d7d1e262f93f172bc19272b637a93.quote_renewal): {"error":"Internal server error"}' } as DomainSettingsViewProps['renewal'] })
  expect(html).not.toContain('Contract read failed')
  expect(html).not.toContain('Internal server error')
  expect(html).toContain('The renewal price could not be read. Try again in a moment.')
  // An error that only names a transaction keeps its reason.
  const expired = `Transaction ${'ab'.repeat(32)} expired before it was included. Try again.`
  expect(userFacingErrorMessage(new Error(expired))).toBe(expired)
})
