import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readUiSource() {
  return [
    'src/App.tsx',
    'src/features/activity/ActivityHistoryView.tsx',
    'src/features/domains/domainFormat.ts',
    'src/features/domains/DomainSettingsView.tsx',
    'src/features/domains/PrimaryNameControl.tsx',
    'src/features/domains/RecordsView.tsx',
    'src/features/domains/SubdomainsView.tsx',
    'src/features/referrals/ActiveReferralCard.tsx',
    'src/features/referrals/ReferralHeader.tsx',
    'src/features/referrals/ReferralLinkCard.tsx',
    'src/features/referrals/ReferralRewardsCard.tsx',
    'src/features/referrals/ReferralsView.tsx',
    'src/features/registration/registrationCopy.ts',
    'src/features/registration/RegistrationCompletionProgress.tsx',
    'src/features/registration/RegistrationFlowPanel.tsx',
    'src/features/registration/RegistrationPolicyNotes.tsx',
    'src/features/registration/RegistrationPurchaseStep.tsx',
    'src/features/registration/RegistrationReviewStep.tsx',
    'src/features/registration/RegistrationSummary.tsx',
    'src/features/registration/ClaimSuccess.tsx',
    'src/features/registration/ReservationRecoveryNotice.tsx',
    'src/features/registration/setup/RegistrationWalletSetupCard.tsx',
    'src/features/search/NameHeader.tsx',
    'src/features/search/SearchResultOverview.tsx',
    'src/features/treasury/TreasuryView.tsx',
  ]
    .map((path) => readFileSync(resolve(process.cwd(), path), 'utf8'))
    .join('\n')
}

describe('App user-facing copy', () => {
  it('keeps primary-name and activity copy product-level', () => {
    const source = readUiSource()

    expect(source).not.toContain('Reverse record target')
    expect(source).not.toContain('Wallets and explorers display')
    expect(source).not.toContain('Moonlight forward record resolves')
    expect(source).not.toContain('<dt>Actor</dt>')
    expect(source).not.toContain('<dt>Block</dt>')
    expect(source).not.toContain('Phoenix payment endpoints')
    expect(source).not.toContain('Moonlight address')
    expect(source).not.toContain('Live writes')
    expect(source).not.toContain('Rewards are indexed for this wallet.')
    expect(source).not.toContain('Reward claiming is not live yet.')
    expect(source).not.toContain('Treasury state has not been indexed yet.')
    expect(source).not.toContain('No operator claims indexed yet.')
    expect(source).not.toContain('No referral rewards are claimable yet.')
    expect(source).not.toContain('Referral rewards need an indexer connection.')
    expect(source).not.toContain('Referral rewards are not indexed yet.')
    expect(source).not.toContain('Treasury data needs an indexer connection.')
    expect(source).not.toContain('Claim submitted. Treasury data will refresh when the indexer is available.')
    expect(source).not.toContain('Claiming is not open yet.')
    expect(source).not.toContain('Saved locally')
    expect(source).not.toContain('32-byte authority')
    expect(source).not.toContain('Raw authority')
    expect(source).not.toContain('Owner controls transfer. Manager controls records.')
    expect(source).not.toContain('Referral cost')
    expect(source).not.toContain('Using referral')
    expect(source).not.toContain('Applied to this browser.')
  })

  it('states that referral attribution does not add buyer cost', () => {
    const source = readUiSource()

    expect(source).toContain('no extra cost')
    expect(source).toContain('No extra fee for the buyer.')
    expect(source).toContain('Referred by')
    expect(source).toContain('Applies to your next registration.')
    expect(source).not.toContain('Included when you register.')
  })

  it('uses explicit missing-wallet recovery copy', () => {
    const source = readUiSource()

    expect(source).toContain('Install Dusk Wallet')
    expect(source).toContain('I installed it')
    expect(source).toContain('Wallet still not detected. Reload this page after installing Dusk Wallet.')
    expect(source).toContain('Reload page')
    expect(source).not.toContain('Check for Dusk wallet again')
  })

  it('uses clear completed-registration copy', () => {
    const source = readUiSource()

    expect(source).toContain('Registration complete')
    expect(source).toContain('is yours')
    expect(source).toContain('Open name')
    expect(source).not.toContain('Review setup')
  })
})
