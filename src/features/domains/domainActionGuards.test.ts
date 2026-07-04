import { describe, expect, it, vi } from 'vitest'

import { guardDomainActionPrerequisite } from './domainActionGuards'

describe('domain action guards', () => {
  it('allows a ready domain action without changing error state', () => {
    const setError = vi.fn()

    expect(guardDomainActionPrerequisite({
      canContinue: true,
      setError,
      walletSetupState: 'connected',
      blockedCopy: 'Connect the owner wallet before renewing this name.',
    })).toBe(true)
    expect(setError).not.toHaveBeenCalled()
  })

  it('uses the action-specific message once the wallet is connected', () => {
    const setError = vi.fn()

    expect(guardDomainActionPrerequisite({
      canContinue: false,
      setError,
      walletSetupState: 'connected',
      blockedCopy: 'Connect the owner wallet before renewing this name.',
    })).toBe(false)
    expect(setError).toHaveBeenCalledWith('Connect the owner wallet before renewing this name.')
  })

  it('uses wallet recovery copy before action-specific validation', () => {
    const setError = vi.fn()

    expect(guardDomainActionPrerequisite({
      canContinue: false,
      setError,
      walletSetupState: 'locked',
      blockedCopy: 'Connect the owner wallet before renewing this name.',
    })).toBe(false)
    expect(setError).toHaveBeenCalledWith('Unlock Dusk Wallet to continue.')
  })
})
