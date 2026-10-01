import { describe, expect, it, vi } from 'vitest'
import { fetchWalletScopedNames } from './myDomainsData'

describe('fetchWalletScopedNames', () => {
  it('returns no names before a wallet is selected', async () => {
    const getAllNames = vi.fn()

    await expect(fetchWalletScopedNames({
      indexerClient: { getAllNames },
      selectedAddress: '',
      selectedAuthority: `0x${'11'.repeat(32)}`,
    })).resolves.toEqual([])

    expect(getAllNames).not.toHaveBeenCalled()
  })

  it('derives the owner key from the selected public wallet when needed', async () => {
    const names = [{ node: 'node-1', canonicalName: 'mine.dusk', owner: '0xfa95da9c6c860cc3d5506de45b01ea84b9d2cad24a23be36003e505222d8d644' }]
    const getAllNames = vi.fn(async () => names)
    const address = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'

    await expect(fetchWalletScopedNames({
      indexerClient: { getAllNames },
      selectedAddress: address,
      selectedAuthority: '',
    })).resolves.toEqual(names)

    expect(getAllNames).toHaveBeenCalledWith({
      owner: '0xfa95da9c6c860cc3d5506de45b01ea84b9d2cad24a23be36003e505222d8d644',
    })
  })

  it('only calls the owner-filtered name list for My Domains', async () => {
    const owner = `0x${'22'.repeat(32)}`
    const names = [{ node: 'node-1', canonicalName: 'mine.dusk', owner }]
    const getAllNames = vi.fn(async () => names)

    await expect(fetchWalletScopedNames({
      indexerClient: { getAllNames },
      selectedAddress: 'dusk1selected',
      selectedAuthority: owner,
    })).resolves.toEqual(names)

    expect(getAllNames).toHaveBeenCalledTimes(1)
    expect(getAllNames).toHaveBeenCalledWith({ owner })
  })

  it('excludes sold names returned because of historical controller activity', async () => {
    const owner = `0x${'22'.repeat(32)}`
    const mine = { node: 'mine', owner, records: [] }
    const sold = { node: 'sold', owner: `0x${'33'.repeat(32)}`, records: [] }
    const getAllNames = vi.fn(async () => [mine, sold])
    await expect(fetchWalletScopedNames({
      indexerClient: { getAllNames }, selectedAddress: 'dusk1selected', selectedAuthority: owner,
    })).resolves.toEqual([mine])
  })

  it('does not scan the global name list for an empty owner', async () => {
    const getAllNames = vi.fn(async () => [])
    const getNames = vi.fn()
    const owner = `0x${'55'.repeat(32)}`
    await expect(fetchWalletScopedNames({
      indexerClient: { getAllNames, getNames } as never,
      selectedAddress: 'dusk-public-address', selectedAuthority: owner,
    })).resolves.toEqual([])
    expect(getAllNames).toHaveBeenCalledExactlyOnceWith({ owner })
    expect(getNames).not.toHaveBeenCalled()
  })
})
