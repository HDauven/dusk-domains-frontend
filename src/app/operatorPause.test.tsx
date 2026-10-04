import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { OperatorPauseBanner } from './OperatorPauseBanner'
import { pauseReason, unpaused } from './operatorPause'
import { deriveRegistrationCapabilities } from './derived/registrationCapabilities'

it('shows calm independent banners only for paused services', () => {
  expect(renderToStaticMarkup(<OperatorPauseBanner pause={unpaused} />)).toBe('')
  const registration = renderToStaticMarkup(<OperatorPauseBanner pause={{ ...unpaused, registrationsPaused: true }} />)
  expect(registration).toContain('Registrations paused')
  expect(registration).not.toContain('Marketplace trading paused')
  const marketplace = renderToStaticMarkup(<OperatorPauseBanner pause={{ ...unpaused, tradingPaused: true }} />)
  expect(marketplace).toContain('Marketplace trading paused')
  expect(marketplace).toContain('withdraw refunds')
  expect(marketplace).not.toContain('Registrations paused')
})

it('blocks both registration stages but preserves the existing commitment window', () => {
  const base = { canRegister: true, commitBusy: false, committed: false, commitWindow: { status: 'ready' }, nodeHex: 'node', chainId: 'dusk:0', preparedCommit: { commitment: 'commitment', controller: 'owner', ownerAddress: 'wallet', chainId: 'dusk:0' }, registrationCompletion: null, registrationTargetReady: true, selectedAddress: 'wallet', selectedAuthority: 'owner', strandedCommitment: null, txBusy: false, walletAuthorized: true } as Parameters<typeof deriveRegistrationCapabilities>[0]
  expect(deriveRegistrationCapabilities(base).canPrepareCommit).toBe(true)
  expect(deriveRegistrationCapabilities({ ...base, registrationsPaused: true }).canPrepareCommit).toBe(false)
  expect(deriveRegistrationCapabilities({ ...base, committed: true }).canRevealRegistration).toBe(true)
  const paused = deriveRegistrationCapabilities({ ...base, committed: true, registrationsPaused: true })
  expect(paused.canRevealRegistration).toBe(false)
  expect(paused.commitStale).toBe(false)
  const stranded = { ...base, committed: true, strandedCommitment: { commitment: 'commitment', controller: 'owner' } } as typeof base
  expect(deriveRegistrationCapabilities(stranded).canRestartReservation).toBe(true)
  expect(deriveRegistrationCapabilities({ ...stranded, registrationsPaused: true }).canRestartReservation).toBe(false)
})

it('guards exactly the paused write calls and leaves exempt calls alone', () => {
  const pause = { registrationsPaused: true, tradingPaused: true }
  for (const [contract, names] of Object.entries({ core: ['commit_runtime', 'complete_registration_runtime', 'escrow_fixed_sale_runtime', 'escrow_auction_runtime', 'accept_marketplace_offer_runtime'], marketplace: ['place_bid_runtime', 'place_offer_runtime', 'buy_fixed_sale_runtime'] })) {
    for (const functionName of names) {
      const call = { contract, functionName } as Parameters<typeof pauseReason>[0]
      expect(pauseReason(call, pause)).toContain('paused')
      expect(pauseReason(call, unpaused)).toBeNull()
    }
  }
  for (const [contract, names] of Object.entries({ core: ['renew_runtime', 'set_record_sender_runtime', 'clear_record_sender_runtime', 'set_primary_name_runtime', 'clear_primary_name_runtime', 'update_authorities_runtime', 'create_subname_runtime'], marketplace: ['cancel_fixed_sale_runtime', 'expire_fixed_sale_runtime', 'cancel_auction_runtime', 'expire_auction_runtime', 'settle_auction_runtime', 'cancel_offer_runtime', 'expire_offer_runtime', 'claim_refund_runtime'], treasury: ['claim_runtime', 'claim_all_runtime', 'claim_referral_reward_runtime', 'claim_all_referral_rewards_runtime'], router: ['issue_reserved_name_runtime', 'propose_operator_runtime', 'accept_operator_runtime', 'cancel_operator_runtime'] })) {
    for (const functionName of names) expect(pauseReason({ contract, functionName } as Parameters<typeof pauseReason>[0], pause)).toBeNull()
  }
})
