import { expect, it } from 'vitest'
import { contractPrincipalFromWalletAccount, encodeBase58 } from '../../names/internal'
import { ownerLabel, sameAuthority } from './ownerLabel'

const address = encodeBase58(Uint8Array.from({ length: 96 }, (_, i) => i + 1))
const parsed = contractPrincipalFromWalletAccount(address)
if (!parsed.ok) throw new Error('Invalid fixture')
const authority = parsed.principal

it('prefers You and normalizes only authority hex', () => {
  expect(ownerLabel(authority, { viewerAuthority: authority.toUpperCase() }).label).toBe('You')
  expect(sameAuthority('', '')).toBe(false)
  expect(sameAuthority(address, address.toUpperCase())).toBe(false)
})

it('only identifies owners from addresses that derive to their authority', () => {
  expect(ownerLabel(authority, { addresses: [address] })).toMatchObject({ kind: 'address', value: address })
  expect(ownerLabel(`0x${'ab'.repeat(32)}`, { addresses: [address] })).toMatchObject({ kind: 'id' })
  expect(ownerLabel(authority, { addresses: ['invalid', authority] })).toMatchObject({ kind: 'id' })
  expect(ownerLabel(address)).toMatchObject({ kind: 'address', value: address })
})
