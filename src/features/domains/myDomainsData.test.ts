import { describe, expect, it, vi } from 'vitest'
import { fetchWalletScopedNames } from './myDomainsData'

describe('fetchWalletScopedNames', () => {
  it('returns no names before a wallet is selected', async () => {
    const getNames = vi.fn()

    await expect(fetchWalletScopedNames({
      indexerClient: { getNames },
      selectedAddress: '',
      selectedAuthority: `0x${'11'.repeat(32)}`,
    })).resolves.toEqual([])

    expect(getNames).not.toHaveBeenCalled()
  })

  it('returns no names when the selected wallet has no authority key', async () => {
    const getNames = vi.fn()

    await expect(fetchWalletScopedNames({
      indexerClient: { getNames },
      selectedAddress: 'dusk1selected',
      selectedAuthority: '',
    })).resolves.toEqual([])

    expect(getNames).not.toHaveBeenCalled()
  })

  it('only calls the owner-filtered name list for My Domains', async () => {
    const names = [{ canonicalName: 'mine.dusk' }]
    const owner = `0x${'22'.repeat(32)}`
    const getNames = vi.fn(async () => names)

    await expect(fetchWalletScopedNames({
      indexerClient: { getNames },
      selectedAddress: 'dusk1selected',
      selectedAuthority: owner,
    })).resolves.toBe(names)

    expect(getNames).toHaveBeenCalledTimes(1)
    expect(getNames).toHaveBeenCalledWith({ owner })
  })
})
