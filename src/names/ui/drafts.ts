// App presentation / HTTP view model, ported from SDK 0.2.0 (MIT).
import { MAX_RECORDS_PER_NAME } from '@duskdomains/sdk'
import { type CoreRecordMutationInput } from '../commands'
import { prepareRecordMutations } from '../recordMutations'
import {
  createResolverRecord,
  getRecordDefinition,
  validateRecordValue,
  type ResolverRecord,
  type ResolverRecordKey,
} from './records'

export type RecordMutationPlan = {
  mutations: CoreRecordMutationInput[]
  errors: string[]
  /** Staged values that can't be saved as they are, with why. */
  invalid: { key: ResolverRecordKey; error: string }[]
}

export function recordValueFor(records: ResolverRecord[], key: ResolverRecordKey): string {
  return records.find((record) => record.key === key)?.value ?? ''
}

export function recordDraftValuesFor(
  keys: readonly ResolverRecordKey[],
  records: ResolverRecord[],
  drafts: Record<string, string>,
): Partial<Record<ResolverRecordKey, string>> {
  return Object.fromEntries(
    keys.map((key) => [key, Object.hasOwn(drafts, key) ? drafts[key] : recordValueFor(records, key)]),
  ) as Partial<Record<ResolverRecordKey, string>>
}

export function recordMutationPlan(
  keys: readonly ResolverRecordKey[],
  records: ResolverRecord[],
  drafts: Record<string, string>,
): RecordMutationPlan {
  const mutations: CoreRecordMutationInput[] = []
  const errors: string[] = []
  const invalid: RecordMutationPlan['invalid'] = []
  // A record the editor cannot write can still be removed: its draft is empty.
  const removable = Object.keys(drafts).filter((key) => !keys.includes(key as ResolverRecordKey)
    && !drafts[key].trim() && records.some((record) => record.key === key)) as ResolverRecordKey[]

  for (const key of [...keys, ...removable]) {
    const existingValue = recordValueFor(records, key)
    const nextValue = (Object.hasOwn(drafts, key) ? drafts[key] : existingValue).trim()

    if (nextValue === existingValue) continue
    if (!nextValue) {
      if (existingValue) mutations.push({ action: 'clear', key })
      continue
    }

    const definition = getRecordDefinition(key)
    const validationErrors = validateRecordValue(key, nextValue)
    if (validationErrors.length > 0) {
      errors.push(`${definition?.label ?? key}: ${validationErrors.join(' ')}`)
      invalid.push({ key, error: validationErrors.join(' ') })
      continue
    }

    const record = createResolverRecord(key, nextValue)
    mutations.push({
      action: 'set',
      key: record.key,
      value: record.value,
      ttlSeconds: record.ttlSeconds,
    })
  }

  if (mutations.length > 0) {
    try {
      prepareRecordMutations(mutations)
    } catch (error) {
      errors.push((error as Error).message)
    }
  }
  const resulting = applyRecordMutations(records, mutations).length
  if (resulting > MAX_RECORDS_PER_NAME && resulting > records.length) {
    const excess = resulting - MAX_RECORDS_PER_NAME
    errors.push(`A name can hold at most ${MAX_RECORDS_PER_NAME} records. Remove ${excess} ${excess === 1 ? 'record' : 'records'} before adding ${excess === 1 ? 'this one' : 'these'}.`)
  }
  return { mutations, errors, invalid }
}

export function applyRecordMutations(
  records: ResolverRecord[],
  mutations: CoreRecordMutationInput[],
): ResolverRecord[] {
  return mutations.reduce((nextRecords, mutation) => {
    if (mutation.action === 'clear') {
      return nextRecords.filter((record) => record.key !== mutation.key)
    }

    return [
      createResolverRecord(mutation.key as ResolverRecordKey, mutation.value),
      ...nextRecords.filter((record) => record.key !== mutation.key),
    ]
  }, records)
}
