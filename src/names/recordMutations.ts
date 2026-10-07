import {
  applyRecordMutations,
  createRecordInput,
  MAX_RECORD_BATCH_PAYLOAD_BYTES,
  MAX_RECORD_MUTATIONS_PER_BATCH,
  type RecordMutation,
} from '@duskdomains/sdk'
import type { CoreRecordMutationInput } from './commandTypes'

/** Encode exactly as the write does and simulate the entire batch before any signing. */
export function prepareRecordMutations(mutations: readonly CoreRecordMutationInput[]): RecordMutation[] {
  let encoded: RecordMutation[] = []
  try {
    encoded = mutations.map((mutation) => mutation.action === 'clear'
      ? { action: 'Clear', key: mutation.key, value: [], ttl_seconds: 0n }
      : { action: 'Set', ...createRecordInput(mutation.key, mutation.value, BigInt(mutation.ttlSeconds)) })
    // The empty starting set isolates batch validation from stale projected records.
    applyRecordMutations([], encoded, 0n)
    return encoded
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    if (code === 'mutation_count') {
      const excess = mutations.length - MAX_RECORD_MUTATIONS_PER_BATCH
      throw new Error(excess > 0
        ? `A record update allows at most ${MAX_RECORD_MUTATIONS_PER_BATCH} changes. Remove ${excess} ${excess === 1 ? 'change' : 'changes'} before saving.`
        : 'Change at least one record before saving.', { cause: error })
    }
    if (code === 'mutation_payload') {
      const size = encoded.reduce((total, mutation) => total + new TextEncoder().encode(mutation.key).length + mutation.value.length, 0)
      const excess = size - MAX_RECORD_BATCH_PAYLOAD_BYTES
      throw new Error(`Record keys and values exceed the 4,096-byte batch limit. Remove changes or shorten values by at least ${excess} ${excess === 1 ? 'byte' : 'bytes'} before saving.`, { cause: error })
    }
    if (code === 'duplicate_key') throw new Error('Keep only one change per record key before saving.', { cause: error })
    throw new Error('Invalid record changes. Check the record keys, values and TTLs before saving.', { cause: error })
  }
}
