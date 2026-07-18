import { describe, expect, it, vi } from 'vitest'
import {
  ensurePublicBalanceForLiveWriteRequest,
  recoverLockedWalletForLiveWrite,
} from './liveWritePreflight'

describe('live write preflight locked-wallet recovery', () => {
  it('switches a local wallet away from its default 8080 node before reading balance', async () => {
    const calls: string[] = []
    const state = {
      node: { chainId: 'dusk:0', networkName: 'Localnet', nodeUrl: 'http://127.0.0.1:8080/' },
    }
    const switchChain = vi.fn(async ({ nodeUrl }: { nodeUrl: string }) => {
      calls.push(`switch:${nodeUrl}`)
      state.node.nodeUrl = nodeUrl
    })
    const getPublicBalance = vi.fn(async () => {
      calls.push('balance')
      return { value: '1000000000' }
    })

    await expect(ensurePublicBalanceForLiveWriteRequest({
      action: 'reserving this name',
      connectKit: { open: vi.fn() },
      expectedNodeUrl: 'http://127.0.0.1:18181/',
      liveWritesEnabled: true,
      refreshWalletConnectionState: vi.fn(),
      refreshWalletSessionState: vi.fn().mockResolvedValue('connected'),
      setError: vi.fn(),
      wallet: { getPublicBalance, state: state as never, switchChain },
    })).resolves.toBe(true)

    expect(calls).toEqual(['switch:http://127.0.0.1:18181/', 'balance'])
  })

  it('requests profiles directly when the authorized wallet is locked', async () => {
    const errors: string[] = []
    const connectOptions = { appName: 'Dusk Domains' }
    const connect = vi.fn().mockResolvedValue([{ account: 'dusk1user', profileId: 'primary' }])
    const refreshWalletSessionState = vi.fn().mockResolvedValue('connected')
    const connectKit = { open: vi.fn() }

    const recovered = await recoverLockedWalletForLiveWrite({
      action: 'reserving this name',
      connectKit,
      connectOptions,
      refreshWalletConnectionState: vi.fn().mockResolvedValue('locked'),
      refreshWalletSessionState,
      setError: (message) => errors.push(message),
      wallet: { connect },
    })

    expect(errors).toEqual([
      'Unlock your wallet to continue reserving this name.',
      '',
    ])
    expect(recovered).toBe(true)
    expect(connect).toHaveBeenCalledWith(connectOptions)
    expect(refreshWalletSessionState).toHaveBeenCalledOnce()
    expect(connectKit.open).not.toHaveBeenCalled()
  })

  it('clears the error when refresh already sees an unlocked wallet', async () => {
    const errors: string[] = []
    const connectKit = { open: vi.fn() }
    const connect = vi.fn()

    const recovered = await recoverLockedWalletForLiveWrite({
      action: 'saving these records',
      connectKit,
      refreshWalletConnectionState: vi.fn().mockResolvedValue('connected'),
      refreshWalletSessionState: vi.fn(),
      setError: (message) => errors.push(message),
      wallet: { connect },
    })

    expect(errors).toEqual([
      'Unlock your wallet to continue saving these records.',
      '',
    ])
    expect(recovered).toBe(true)
    expect(connect).not.toHaveBeenCalled()
    expect(connectKit.open).not.toHaveBeenCalled()
  })

  it('opens the connect modal when direct unlock is unavailable', async () => {
    const errors: string[] = []
    const connectKit = { open: vi.fn() }

    const recovered = await recoverLockedWalletForLiveWrite({
      action: 'claiming referral rewards',
      connectKit,
      refreshWalletConnectionState: vi.fn().mockResolvedValue('locked'),
      refreshWalletSessionState: vi.fn(),
      setError: (message) => errors.push(message),
      wallet: {},
    })

    expect(errors).toEqual([
      'Unlock your wallet to continue claiming referral rewards.',
    ])
    expect(recovered).toBe(false)
    expect(connectKit.open).toHaveBeenCalledOnce()
  })

  it('does not open the modal again when the direct unlock request is rejected', async () => {
    const errors: string[] = []
    const connectKit = { open: vi.fn() }

    const recovered = await recoverLockedWalletForLiveWrite({
      action: 'reserving this name',
      connectKit,
      refreshWalletConnectionState: vi.fn().mockResolvedValue('locked'),
      refreshWalletSessionState: vi.fn(),
      setError: (message) => errors.push(message),
      wallet: {
        connect: vi.fn().mockRejectedValue(new Error('Local dev wallet rejected the profile request.')),
      },
    })

    expect(errors).toEqual([
      'Unlock your wallet to continue reserving this name.',
      'The wallet request was rejected.',
    ])
    expect(recovered).toBe(false)
    expect(connectKit.open).not.toHaveBeenCalled()
  })

  it('does not treat direct unlock as recovered until a profile is visible', async () => {
    const errors: string[] = []
    const connectKit = { open: vi.fn() }

    const recovered = await recoverLockedWalletForLiveWrite({
      action: 'reserving this name',
      connectKit,
      refreshWalletConnectionState: vi.fn().mockResolvedValue('locked'),
      refreshWalletSessionState: vi.fn().mockResolvedValue('locked'),
      setError: (message) => errors.push(message),
      wallet: {
        connect: vi.fn().mockResolvedValue([]),
      },
    })

    expect(errors).toEqual([
      'Unlock your wallet to continue reserving this name.',
    ])
    expect(recovered).toBe(false)
    expect(connectKit.open).not.toHaveBeenCalled()
  })

  it('opens the connect modal when refresh fails', async () => {
    const errors: string[] = []
    const connectKit = { open: vi.fn() }

    const recovered = await recoverLockedWalletForLiveWrite({
      action: 'updating pricing',
      connectKit,
      refreshWalletConnectionState: vi.fn().mockRejectedValue(new Error('Dusk Wallet is locked')),
      refreshWalletSessionState: vi.fn(),
      setError: (message) => errors.push(message),
      wallet: {},
    })

    expect(errors).toEqual([
      'Unlock your wallet to continue updating pricing.',
      'Connect or unlock your wallet to continue.',
    ])
    expect(recovered).toBe(false)
    expect(connectKit.open).toHaveBeenCalledOnce()
  })

  it('continues the original preflight after direct unlock succeeds', async () => {
    const errors: string[] = []
    const getPublicBalance = vi.fn()
      .mockRejectedValueOnce(new Error('Dusk Wallet is locked'))
      .mockResolvedValueOnce({ value: '1200000000' })
    const connect = vi.fn().mockResolvedValue([{ account: 'dusk1user', profileId: 'primary' }])
    const connectKit = { open: vi.fn() }

    await expect(ensurePublicBalanceForLiveWriteRequest({
      action: 'reserving this name',
      connectKit,
      liveWritesEnabled: true,
      refreshWalletConnectionState: vi.fn().mockResolvedValue('locked'),
      refreshWalletSessionState: vi.fn().mockResolvedValue('connected'),
      setError: (message) => errors.push(message),
      wallet: { connect, getPublicBalance },
    })).resolves.toBe(true)

    expect(errors).toEqual([
      'Unlock your wallet to continue reserving this name.',
      '',
    ])
    expect(getPublicBalance).toHaveBeenCalledTimes(2)
    expect(connect).toHaveBeenCalledOnce()
    expect(connectKit.open).not.toHaveBeenCalled()
  })

  it('keeps the action blocked after unlock when the public balance is insufficient', async () => {
    const errors: string[] = []
    const getPublicBalance = vi.fn()
      .mockRejectedValueOnce(new Error('Dusk Wallet is locked'))
      .mockResolvedValueOnce({ value: '199999999' })

    await expect(ensurePublicBalanceForLiveWriteRequest({
      action: 'reserving this name',
      connectKit: { open: vi.fn() },
      liveWritesEnabled: true,
      refreshWalletConnectionState: vi.fn().mockResolvedValue('locked'),
      refreshWalletSessionState: vi.fn().mockResolvedValue('connected'),
      setError: (message) => errors.push(message),
      wallet: {
        connect: vi.fn().mockResolvedValue([{ account: 'dusk1user', profileId: 'primary' }]),
        getPublicBalance,
      },
    })).resolves.toBe(false)

    expect(errors).toEqual([
      'Unlock your wallet to continue reserving this name.',
      '',
      'Insufficient public DUSK for reserving this name. Available: 0.199999999 DUSK. Required: 0.2 DUSK.',
    ])
    expect(getPublicBalance).toHaveBeenCalledTimes(2)
  })

  it('does not retry balance checks when unlock falls back to the modal', async () => {
    const getPublicBalance = vi.fn().mockRejectedValue(new Error('Dusk Wallet is locked'))
    const connectKit = { open: vi.fn() }

    await expect(ensurePublicBalanceForLiveWriteRequest({
      action: 'claiming treasury funds',
      connectKit,
      liveWritesEnabled: true,
      refreshWalletConnectionState: vi.fn().mockResolvedValue('locked'),
      refreshWalletSessionState: vi.fn(),
      setError: vi.fn(),
      wallet: { getPublicBalance },
    })).resolves.toBe(false)

    expect(getPublicBalance).toHaveBeenCalledOnce()
    expect(connectKit.open).toHaveBeenCalledOnce()
  })
})
