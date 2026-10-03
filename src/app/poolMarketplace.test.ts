import { expect, it, vi } from 'vitest'
import { readPoolMarketplace } from './poolMarketplace'
import { canRenewOutsideEscrow, isMarketplaceEscrow } from './managedNameState'

it.each([
  { marketplace: Array(32).fill(0xab) },
  { marketplace: 'ab'.repeat(32) },
  { output: { marketplace: `0x${'AB'.repeat(32)}` }, fnName: 'config' },
])('reads the marketplace identity from router config: %j', async response => {
  const read = vi.fn().mockResolvedValue(response)
  expect(await readPoolMarketplace({ read })).toBe(`0x${'ab'.repeat(32)}`)
  expect(read).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ contract: 'router', functionName: 'config', kind: 'read' }))
})

it.each([null, {}, { marketplace: '' }, { marketplace: Array(31).fill(1) }, { marketplace: Array(32).fill(256) }, { marketplace: Array(32).fill(1.5) }])('leaves malformed config unknown: %j', async response => {
  expect(await readPoolMarketplace({ read: async () => response })).toBeNull()
})

it('keeps read failures unknown', async () => {
  expect(await readPoolMarketplace({ read: async () => { throw new Error('offline') } })).toBeNull()
})

it.each([new Array(32), Object.assign(new Array(32), { 0: 1 }), Array(32).fill('1'), Array(32).fill(-1), Array(32).fill(1.5), Array(32).fill(0), '00'.repeat(32), `0x${'00'.repeat(32)}`])('blocks contract-owned renewal with an invalid marketplace ID: %j', async marketplace => {
  const id = await readPoolMarketplace({ read: async () => ({ marketplace }) })
  expect(id).toBeNull()
  const inMarketplaceEscrow = isMarketplaceEscrow({ owner: `0x${'ab'.repeat(32)}`, manager: 'seller' }, id)
  expect(inMarketplaceEscrow).toBeNull()
  expect(canRenewOutsideEscrow({ ownerIsContract: true, inMarketplaceEscrow })).toBe(false)
})
