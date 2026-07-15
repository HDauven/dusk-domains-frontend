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

  it('derives the owner key from the selected public wallet when needed', async () => {
    const names = [{ node: 'node-1', canonicalName: 'mine.dusk' }]
    const getNames = vi.fn(async () => names)
    const address = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'

    await expect(fetchWalletScopedNames({
      indexerClient: { getNames },
      selectedAddress: address,
      selectedAuthority: '',
    })).resolves.toEqual(names)

    expect(getNames).toHaveBeenCalledWith({
      owner: '0xfa95da9c6c860cc3d5506de45b01ea84b9d2cad24a23be36003e505222d8d644',
    })
  })

  it('only calls the owner-filtered name list for My Domains', async () => {
    const names = [{ node: 'node-1', canonicalName: 'mine.dusk' }]
    const owner = `0x${'22'.repeat(32)}`
    const getNames = vi.fn(async () => names)

    await expect(fetchWalletScopedNames({
      indexerClient: { getNames },
      selectedAddress: 'dusk1selected',
      selectedAuthority: owner,
    })).resolves.toEqual(names)

    expect(getNames).toHaveBeenCalledTimes(1)
    expect(getNames).toHaveBeenCalledWith({ owner })
  })

  it('falls back to public address records when owner lookup returns nothing', async () => {
    const address = 'dusk-public-address'
    const linked = {
      node: 'node-linked',
      canonicalName: 'linked.dusk',
      owner: `0x${'33'.repeat(32)}`,
      manager: `0x${'33'.repeat(32)}`,
      records: [{ key: 'moonlight_address', value: address }],
    }
    const unrelated = {
      node: 'node-unrelated',
      canonicalName: 'other.dusk',
      owner: `0x${'44'.repeat(32)}`,
      manager: `0x${'44'.repeat(32)}`,
      records: [],
    }
    const getNames = vi.fn(async (params?: { owner?: string }) => (
      params?.owner ? [] : [linked, unrelated]
    ))

    await expect(fetchWalletScopedNames({
      indexerClient: { getNames },
      selectedAddress: address,
      selectedAuthority: `0x${'55'.repeat(32)}`,
    })).resolves.toEqual([linked])
  })
})
