import { describe, expect, it } from 'vitest'
import type { DuskWalletState } from '../../names/internal'
import {
  deriveWalletSessionModel,
  walletActionLabel,
  walletActionTitle,
  walletBlockedActionCopy,
  walletCanSign,
  walletConnectionStatus,
  walletRequiredHeading,
  walletRequiredIntro,
} from './walletStatus'

function walletState(overrides: Partial<DuskWalletState> = {}): DuskWalletState {
  return {
    accounts: [],
    authorized: false,
    availableProviders: [],
    capabilities: null,
    chainId: null,
    installed: true,
    lastUpdated: 0,
    node: null,
    profiles: [],
    providerId: 'dusk-wallet',
    providerInfo: {
      icon: '',
      name: 'Dusk Wallet',
      rdns: 'network.dusk.wallet',
      uuid: 'dusk-wallet',
    },
    selectedAddress: null,
    selectedProfile: null,
    ...overrides,
  }
}

describe('wallet status', () => {
  it('treats authorized empty profiles as locked, not signing-ready', () => {
    const state = walletState({ authorized: true })

    expect(walletConnectionStatus(state, true)).toBe('locked')
    expect(walletCanSign(state, '')).toBe(false)
    expect(deriveWalletSessionModel(state, true)).toMatchObject({
      authorized: true,
      canSign: false,
      locked: true,
      selectedAddress: '',
      status: 'locked',
    })
  })

  it('requires a visible profile before enabling signing flows', () => {
    const selectedAddress = 'dusk1account'
    const state = walletState({
      accounts: [selectedAddress],
      authorized: true,
      chainId: 'dusk:3',
      profiles: [{ account: selectedAddress, profileId: 'primary' }],
      selectedAddress,
      selectedProfile: { account: selectedAddress, profileId: 'primary' },
    })

    expect(walletConnectionStatus(state, true, 'dusk:3')).toBe('connected')
    expect(walletCanSign(state, selectedAddress)).toBe(true)
    expect(deriveWalletSessionModel(state, true, 'dusk:3')).toMatchObject({
      authorized: true,
      canSign: true,
      expectedChainId: 'dusk:3',
      locked: false,
      selectedAddress,
      status: 'connected',
      walletChainId: 'dusk:3',
    })
  })

  it('keeps the address visible but blocks signing on the wrong network', () => {
    const selectedAddress = 'dusk1account'
    const state = walletState({
      accounts: [selectedAddress],
      authorized: true,
      chainId: 'dusk:3',
      profiles: [{ account: selectedAddress, profileId: 'primary' }],
      selectedAddress,
      selectedProfile: { account: selectedAddress, profileId: 'primary' },
    })

    expect(walletConnectionStatus(state, true, 'dusk:0')).toBe('wrong-network')
    expect(deriveWalletSessionModel(state, true, 'dusk:0')).toMatchObject({
      authorized: true,
      canSign: false,
      expectedChainId: 'dusk:0',
      locked: false,
      selectedAddress,
      status: 'wrong-network',
      walletChainId: 'dusk:3',
    })
  })

  it('does not expose a stale selected address while detecting or locked', () => {
    const selectedAddress = 'dusk1previous'
    const state = walletState({
      accounts: [selectedAddress],
      authorized: true,
      selectedAddress,
    })

    expect(deriveWalletSessionModel(state, false)).toMatchObject({
      canSign: false,
      selectedAddress: '',
      status: 'detecting',
    })
    expect(deriveWalletSessionModel({ ...state, accounts: [], selectedAddress: null }, true)).toMatchObject({
      canSign: false,
      selectedAddress: '',
      status: 'locked',
    })
  })

  it('uses precise wallet-required copy for setup prompts', () => {
    expect(walletRequiredHeading('missing')).toBe('Wallet required')
    expect(walletRequiredIntro('missing', 'Create your referral link.')).toBe('Install or enable Dusk Wallet to continue.')
    expect(walletRequiredHeading('detecting')).toBe('Checking wallet')
    expect(walletRequiredIntro('detecting', 'Create your referral link.')).toBe('Checking for Dusk Wallet.')
    expect(walletRequiredHeading('disconnected')).toBe('Connect wallet')
    expect(walletRequiredIntro('disconnected', 'Create your referral link.')).toBe('Connect Dusk Wallet to continue.')
    expect(walletRequiredHeading('locked')).toBe('Wallet locked')
    expect(walletRequiredIntro('locked', 'Create your referral link.')).toBe('Unlock Dusk Wallet to continue.')
    expect(walletRequiredHeading('wrong-network')).toBe('Wrong network')
    expect(walletRequiredIntro('wrong-network', 'Create your referral link.')).toBe('Switch Dusk Wallet to this app network.')
    expect(walletRequiredHeading('connected')).toBe('Ready')
    expect(walletRequiredIntro('connected', 'Create your referral link.')).toBe('Create your referral link.')
  })

  it('uses status-specific wallet action labels and titles', () => {
    expect(walletActionLabel('missing')).toBe('Connect Wallet')
    expect(walletActionTitle('missing')).toBe('Open wallet connection')
    expect(walletActionLabel('disconnected')).toBe('Connect Wallet')
    expect(walletActionTitle('disconnected')).toBe('Open Dusk Wallet to connect')
    expect(walletActionLabel('locked')).toBe('Unlock Wallet')
    expect(walletActionTitle('locked')).toBe('Open Dusk Wallet to unlock')
    expect(walletActionLabel('wrong-network')).toBe('Switch Network')
    expect(walletActionTitle('wrong-network')).toBe('Switch Dusk Wallet to this app network')
    expect(walletActionLabel('detecting')).toBe('Checking Wallet')
    expect(walletActionTitle('detecting')).toBe('Checking for Dusk Wallet')
    expect(walletActionLabel('connected')).toBe('Wallet')
    expect(walletActionTitle('connected')).toBe('Open wallet connection')
  })

  it('uses unlock/install/connect copy before falling back to action-specific validation', () => {
    expect(walletBlockedActionCopy('locked', 'Connect the owner wallet before renewing this name.')).toBe(
      'Unlock Dusk Wallet to continue.',
    )
    expect(walletBlockedActionCopy('missing', 'Connect the owner wallet before renewing this name.')).toBe(
      'Install or enable Dusk Wallet to continue.',
    )
    expect(walletBlockedActionCopy('disconnected', 'Connect the owner wallet before renewing this name.')).toBe(
      'Connect Dusk Wallet to continue.',
    )
    expect(walletBlockedActionCopy('wrong-network', 'Connect the owner wallet before renewing this name.')).toBe(
      'Switch Dusk Wallet to this app network.',
    )
    expect(walletBlockedActionCopy('connected', 'Connect the owner wallet before renewing this name.')).toBe(
      'Connect the owner wallet before renewing this name.',
    )
  })
})
