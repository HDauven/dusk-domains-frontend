import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { OperatorPauseBanner } from './OperatorPauseBanner'
import { pauseReason, unpaused } from './operatorPause'
import { deriveRegistrationCapabilities } from './derived/registrationCapabilities'

it('shows calm independent banners only for paused services', () => {
  expect(renderToStaticMarkup(<OperatorPauseBanner pause={unpaused} />)).toBe('')
  const registration = renderToStaticMarkup(<OperatorPauseBanner pause={{ ...unpaused, registrationsPaused: true }} />)
  expect(registration).toContain('Registrations paused')
  expect(registration).not.toContain('New marketplace orders and bids paused')
  const marketplace = renderToStaticMarkup(<OperatorPauseBanner pause={{ ...unpaused, tradingPaused: true }} />)
  expect(marketplace).toContain('New marketplace orders and bids paused')
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
  for (const [contract, names] of Object.entries({ store: ['commit', 'complete_registration', 'escrow_fixed_sale', 'escrow_auction'], marketplace: ['place_offer', 'place_bid'] })) {
    for (const functionName of names) {
      const call = { contract, functionName } as Parameters<typeof pauseReason>[0]
      expect(pauseReason(call, pause)).toContain('paused')
      expect(pauseReason(call, unpaused)).toBeNull()
    }
  }
  for (const [contract, names] of Object.entries({ store: ['accept_marketplace_offer', 'renew', 'set_record_sender', 'clear_record_sender', 'set_primary_name', 'clear_primary_name', 'update_authorities', 'create_subname'], marketplace: ['buy_fixed_sale', 'cancel_fixed_sale', 'expire_fixed_sale', 'cancel_auction', 'expire_auction', 'settle_auction', 'cancel_offer', 'expire_offer', 'claim_refund'], vault: ['claim', 'claim_all', 'claim_referral_reward', 'claim_all_referral_rewards'], directory: ['issue_reserved_name', 'propose_operator', 'accept_operator', 'cancel_operator'] })) {
    for (const functionName of names) expect(pauseReason({ contract, functionName } as Parameters<typeof pauseReason>[0], pause)).toBeNull()
  }
})
