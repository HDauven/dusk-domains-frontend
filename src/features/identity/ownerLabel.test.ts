import { account } from '../../test/frozenFixtures'
import { expect, it } from 'vitest'
import { contractPrincipalFromWalletAccount } from '../../names/internal'
import { ownerAddressCandidates, ownerLabel, sameAuthority } from './ownerLabel'

const address = account
const parsed = contractPrincipalFromWalletAccount(address)
if (!parsed.ok) throw new Error('Invalid fixture')
const authority = parsed.principal

it('prefers You and normalizes only authority hex', () => {
  expect(ownerLabel(authority, { viewerAuthority: authority.toUpperCase() }).label).toBe('You')
  expect(sameAuthority('', '')).toBe(false)
  expect(sameAuthority(address, address.toUpperCase())).toBe(false)
  expect(sameAuthority(address, authority)).toBe(true)
})

it('only identifies owners from addresses that derive to their authority', () => {
  expect(ownerLabel(authority, { addresses: [address] })).toMatchObject({ kind: 'address', value: address })
  expect(ownerLabel(`0x${'ab'.repeat(32)}`, { addresses: [address] })).toMatchObject({ kind: 'id' })
  expect(ownerLabel(authority, { addresses: ['invalid', authority] })).toMatchObject({ kind: 'id' })
  expect(ownerLabel(address)).toMatchObject({ kind: 'address', value: address })
})

it('uses known primary endpoints without mistaking a different payment address for the owner', () => {
  const candidates = ownerAddressCandidates([{ key: 'moonlight_address', value: 'another address' }], [
    { eventType: 'primary_name', target: `moonlight_address:${address}` },
    { eventType: 'record_update', target: address },
  ])
  expect(candidates).toEqual(['another address', address])
  expect(ownerLabel(authority, { addresses: candidates }).value).toBe(address)
})

it.each(['primary_name_set', 'primary_name_cleared'])('uses endpoints retained in %s activity', eventType => {
  expect(ownerAddressCandidates([], [{ eventType, target: `moonlight_address:${address}` }])).toEqual([address])
})
