import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ClaimSuccess } from '../registration/ClaimSuccess'
import { RegistrationFlowPanel } from '../registration/RegistrationFlowPanel'
import { DomainDetailsView } from '../domains/DomainDetailsView'
import { TreasuryView } from '../treasury/TreasuryView'
import { NAME_CONTROL_SUMMARY, NAME_CONTROL_TERMS, nameControlCopy } from './trustCopy'
import { DEFAULT_FEE_CONFIG } from '../../names/internal'

const text = (html: string) => html.replaceAll('&#x27;', '\'').replaceAll('<!-- -->', '')

describe('who controls a name', () => {
  it('states the Terms sentence exactly in the Terms of Use, with the manager', () => {
    expect(readFileSync('src/legal/terms.md', 'utf8')).toContain(NAME_CONTROL_TERMS)
    expect(NAME_CONTROL_TERMS).toBe('Once a name is registered, only its owner and its manager control it, and they are usually the same wallet. A manager can change the name\'s records and subnames but can\'t transfer it. We can\'t take a name, change its records or move anyone else\'s funds on chain. Our website and API may hide abusive names from display. A name stays its owner\'s while they keep renewing it.')
  })

  it('tells the new owner in the claim confirmation, including what a manager could do', () => {
    const html = text(renderToStaticMarkup(<ClaimSuccess name="aurora.dusk" onOpen={vi.fn()} progress={null} />))
    expect(html).toContain(nameControlCopy('aurora.dusk'))
    expect(nameControlCopy('aurora.dusk')).toBe('Only your wallet controls aurora.dusk. If you make another wallet its manager, that wallet can change its records and subnames but can\'t transfer it. The Dusk Domains team can\'t take it, change its records or move your funds on chain. Our website and API may hide abusive names from display. It stays yours while you keep renewing it.')
  })

  const page = (displayName: string, isOwner: boolean, separateManager = false) => text(renderToStaticMarkup(<DomainDetailsView displayName={displayName} isOwner={isOwner}
    separateManager={separateManager} canEdit={isOwner} onManageRecords={vi.fn()} onSubdomains={vi.fn()} parentResolverRecords={[]} paysPreviousOwner={null}
    primaryVerification={{ tone: 'muted', title: '', description: '', displayValue: '' }} subnames={[]} viewerAuthority=""
    activity={{ activityEntries: [], currentBlockHeight: null, formatActivityTime: vi.fn(), onActivity: vi.fn() }} />))

  it('tells the owner on a root name page, and nobody else', () => {
    expect(page('aurora.dusk', true)).toContain(nameControlCopy('aurora.dusk'))
    expect(page('aurora.dusk', false)).not.toContain('controls aurora.dusk')
    expect(page('pay.aurora.dusk', true)).not.toContain('controls pay.aurora.dusk')
  })

  it('never tells an owner only their wallet controls a name another wallet manages', () => {
    const html = page('aurora.dusk', true, true)
    expect(html).not.toContain('Only your wallet')
    expect(html).toContain('You own aurora.dusk and another wallet manages it. That wallet can change its records and subnames but can\'t transfer it.')
    expect(nameControlCopy('aurora.dusk', true)).toBe('You own aurora.dusk and another wallet manages it. That wallet can change its records and subnames but can\'t transfer it. The Dusk Domains team can\'t take it, change its records or move your funds on chain. Our website and API may hide abusive names from display. It stays yours while you keep renewing it.')
  })

  it('states what the team can and cannot do on the Treasury page', () => {
    const html = text(renderToStaticMarkup(<TreasuryView treasuryState={{ initialized: true, source: 'vault', availableLux: '0', referralClaimableLux: '0', accountedLux: '0', claims: [] } as never}
      claim={{} as never} pricing={{ feeConfig: DEFAULT_FEE_CONFIG, feeConfigError: '', feeConfigLoaded: true } as never}
      wallet={{ connectedAsTreasuryOperator: false } as never} treasuryConfirmation="" treasuryError="" treasuryLoading={false} />))
    expect(html).toContain('The operator can claim the protocol\'s share of the fees held here.')
    expect(html).toContain(NAME_CONTROL_SUMMARY)
    expect(html).not.toMatch(/only its holder|Only your wallet/)
    // Shown for every name, so it keeps the exceptions: subnames, and names held by the market while listed,
    // which nobody renews through this site and which are lost when their grace period ends.
    expect(NAME_CONTROL_SUMMARY).toBe(`${NAME_CONTROL_TERMS.replace('We can\'t', 'The Dusk Domains team can\'t')} A subname is the exception: the owner or manager of a name above it can take it back. While a name is listed, the market contract holds it until it sells, is returned or its grace period ends.`)
  })

  it('keeps the Terms in step with the contracts on prices, renewal and the treasury', () => {
    const terms = readFileSync('src/legal/terms.md', 'utf8')
    // Renewal prices can change for names already registered, and the operator can claim only the protocol's share.
    expect(terms).toContain('setting prices for future registrations and renewals, choosing reserved names and the shortest registrable name for future registrations')
    expect(terms).toContain('collecting the protocol\'s share of the treasury')
    expect(terms).toContain('We may use the protocol\'s share of the treasury as we see fit')
    // Reserving a name, or the shortest name allowed, affects who can register it, not renewals.
    expect(terms).toContain('Which names are reserved, and the shortest name that can be registered, are set by the protocol and may change for future registrations. Prices are also set by the protocol and may change for future registrations and renewals.')
    // Anyone can pay to renew a listed name, on chain and on this website; the listing stays as it is.
    expect(terms).not.toContain('can\'t be renewed until the listing ends')
    expect(terms).not.toContain('This website renews')
    expect(terms).not.toContain('only after it leaves the market')
    expect(terms).toContain('On this website, a name\'s owner or manager can renew it, and anyone can renew a listed name, which leaves the listing unchanged.')
    expect(terms).not.toMatch(/move anyone's funds/)
    const llms = readFileSync('scripts/site/llms.txt', 'utf8')
    expect(llms).not.toContain('unless it is listed in the market')
    expect(llms).not.toContain('This site renews')
    expect(llms).not.toContain('only after it leaves the market')
    expect(llms.split('On this site, a name\'s owner or manager can renew it, and anyone can renew a listed name, which leaves the listing unchanged.')).toHaveLength(3)
    expect(llms).toContain('The owner or manager of alice.dusk can reassign or take back its subnames at any time')
  })
})

describe('why two signatures', () => {
  it('explains the two-step claim in one line', () => {
    const html = text(renderToStaticMarkup(<RegistrationFlowPanel navigation={{ onBackToOverview: vi.fn() }} resultIssues={[]}
      status={{ onViewPendingReservation: vi.fn(), showReservationRecovery: false, walletError: '' }}
      step={{ registrationStep: 'review', quote: { duration: 1, expiryDate: '2027-10-11', feeConfigError: '', registrationFee: 10, registrationTargetAddress: '' },
        referral: { activeReferral: null, appliedReferral: null }, reservation: { committed: false }, purchase: {},
        wallet: { walletSetupState: 'disconnected', selectedAddress: '' }, primaryChoice: { registerSetsPrimary: true } } as never}
      wizard={{ displayName: 'aurora.dusk', registrationComplete: false, registrationStep: 'review' }} />))
    expect(html).toContain('Two signatures: the first reserves the name without revealing it, so nobody can see it and register it first. The second registers it and pays.')
  })
})

describe('support, abuse and security contacts', () => {
  const sources = { terms: readFileSync('src/legal/terms.md', 'utf8'), privacy: readFileSync('src/legal/privacy.md', 'utf8'), llms: readFileSync('scripts/site/llms.txt', 'utf8') }
  it.each(['mainnet', 'testnet'])('match the %s site links everywhere', network => {
    const env = parseEnv(readFileSync(`.env.${network}.example`, 'utf8'))
    const support = env.VITE_DUSK_DOMAINS_SUPPORT_URL!, abuse = env.VITE_DUSK_DOMAINS_ABUSE_URL!, security = env.VITE_DUSK_DOMAINS_SECURITY_URL!
    expect([support, abuse, security]).toEqual(['mailto:support@dusk.domains', 'mailto:abuse@dusk.domains', 'mailto:security@dusk.domains'])
    for (const href of [support, abuse, security]) {
      expect(sources.terms).toContain(`(${href})`)
      expect(sources.llms).toContain(`(${href})`)
    }
    expect(sources.privacy).toContain(`(${support})`)
  })

  it('no longer sends people to GitHub forms', () => {
    for (const source of Object.values(sources)) {
      expect(source).not.toMatch(/github\.com\/HDauven\/dusk-domains-frontend\/(issues|security)/)
      expect(source).not.toMatch(/request form|issue form|forms in our/i)
    }
  })
})
