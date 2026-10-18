import { expect, it, vi } from 'vitest'
import { readPoolMarketplace } from './poolMarketplace'
import { isMarketplaceEscrow } from './managedNameState'

const market = Array(32).fill(0xab)
const state = (preferred: unknown, recorded: unknown = preferred) => ({
  config: { preferred_marketplace: preferred },
  market: recorded === null ? null : { id: recorded },
})

it('reads the preferred marketplace from the directory state, with the record it came with', async () => {
  const bootstrap = vi.fn().mockResolvedValue(state(market))
  expect(await readPoolMarketplace({ bootstrap } as never)).toEqual({ preferred: `0x${'ab'.repeat(32)}`, recorded: true })
  expect(bootstrap).toHaveBeenCalledOnce()
})

it('knows the preferred marketplace without counting another market’s record as its own', async () => {
  expect(await readPoolMarketplace({ bootstrap: async () => state(market, Array(32).fill(0xcd)) } as never))
    .toEqual({ preferred: `0x${'ab'.repeat(32)}`, recorded: false })
  expect(await readPoolMarketplace({ bootstrap: async () => state(market, null) } as never))
    .toEqual({ preferred: `0x${'ab'.repeat(32)}`, recorded: false })
})

it('has no preferred marketplace while the directory prefers none', async () => {
  expect(await readPoolMarketplace({ bootstrap: async () => state(null) } as never)).toEqual({ preferred: null, recorded: false })
})

it('keeps read failures and a missing client unknown', async () => {
  expect(await readPoolMarketplace({ bootstrap: async () => { throw new Error('offline') } } as never)).toEqual({ preferred: null, recorded: false })
  expect(await readPoolMarketplace(null)).toEqual({ preferred: null, recorded: false })
})

it.each([new Array(32), Object.assign(new Array(32), { 0: 1 }), Array(32).fill('1'), Array(32).fill(-1), Array(32).fill(1.5), Array(32).fill(0), '00'.repeat(32), `0x${'00'.repeat(32)}`])('leaves marketplace custody unknown with an invalid marketplace ID: %j', async preferred => {
  const { preferred: id } = await readPoolMarketplace({ bootstrap: async () => state(preferred) } as never)
  expect(id).toBeNull()
  expect(isMarketplaceEscrow({ owner: `0x${'ab'.repeat(32)}`, manager: 'seller' }, id)).toBeNull()
})
