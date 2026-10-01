import { expect, it } from 'vitest'
import { isMarketplaceEscrow } from './managedNameState'

const marketplace = 'ab'.repeat(32)

it.each([
  { owner: `0x${marketplace.toUpperCase()}`, manager: 'seller' },
  { owner: 'seller', manager: marketplace },
  { owner: marketplace, manager: marketplace },
])('recognizes either marketplace authority as escrow: %s', name => {
  expect(isMarketplaceEscrow(name, `0x${marketplace}`)).toBe(true)
  expect(isMarketplaceEscrow(name, 'cd'.repeat(32))).toBe(false)
})

it.each(['0'.repeat(64), `0x${'0'.repeat(64)}`])('treats an unset marketplace as no escrow: %s', marketplaceContractId => {
  expect(isMarketplaceEscrow({ owner: marketplaceContractId, manager: marketplaceContractId }, marketplaceContractId)).toBe(false)
})

it.each([null, ''])('keeps escrow unknown without a marketplace identity: %s', id => {
  expect(isMarketplaceEscrow({ owner: marketplace, manager: marketplace }, id)).toBeNull()
})
