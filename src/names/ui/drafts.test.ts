import { expect, it } from 'vitest'
import { account } from '../../test/frozenFixtures'
import { prepareRecordMutations } from '../recordMutations'
import { recordMutationPlan } from './drafts'
import { createResolverRecord, type ResolverRecordKey } from './records'

const keys: ResolverRecordKey[] = Array.from({ length: 8 }, (_, i) => `text.k${i}`)
// Each key is 7 bytes and each value 505 UTF-8 bytes: 8 * 512 = 4,096.
const drafts = Object.fromEntries(keys.map(key => [key, 'é'.repeat(252) + 'a']))

it('accepts eight edits at exactly 4,096 encoded bytes', () => {
  const plan = recordMutationPlan(keys, [], drafts)
  expect(plan.errors).toEqual([])
  expect(plan.mutations).toHaveLength(8)
  const encoded = prepareRecordMutations(plan.mutations)
  expect(encoded.reduce((sum, m) => sum + new TextEncoder().encode(m.key).length + m.value.length, 0)).toBe(4096)
})

it('refuses 4,097 encoded bytes and explains how much to remove', () => {
  const plan = recordMutationPlan(keys, [], { ...drafts, 'text.k0': drafts['text.k0'] + 'b' })
  expect(plan.mutations).toHaveLength(8)
  expect(plan.errors).toEqual(['Record keys and values exceed the 4,096-byte batch limit. Remove changes or shorten values by at least 1 byte before saving.'])
})

it('refuses nine edits without splitting or dropping any changes', () => {
  const nineKeys: ResolverRecordKey[] = [...keys, 'text.k8']
  const plan = recordMutationPlan(nineKeys, [], Object.fromEntries(nineKeys.map(key => [key, 'a'])))
  expect(plan.mutations).toHaveLength(9)
  expect(plan.errors).toEqual(['A record update allows at most 8 changes. Remove 1 change before saving.'])
})

it('counts clears as changes and counts their keys in the batch', () => {
  const records = [...keys, 'text.k8' as const].map(key => createResolverRecord(key, 'old'))
  const plan = recordMutationPlan(records.map(r => r.key), records, Object.fromEntries(records.map(r => [r.key, ''])))
  expect(plan.errors[0]).toContain('Remove 1 change')
  expect(plan.mutations.every(m => m.action === 'clear')).toBe(true)
})

it('uses SDK address encoding and leaves unchanged drafts alone', () => {
  const record = createResolverRecord('moonlight_address', account)
  expect(recordMutationPlan(['moonlight_address'], [record], {})).toEqual({ mutations: [], errors: [] })
  const plan = recordMutationPlan(['moonlight_address'], [], { moonlight_address: account })
  expect(plan.errors).toEqual([])
  expect(prepareRecordMutations(plan.mutations)[0].value).toHaveLength(96)
})
