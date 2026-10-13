import { validateRecordValue, type ResolverRecord } from '../../names/internal'

type AddressRecord = Pick<ResolverRecord, 'key' | 'value' | 'resolverIssue'>

/**
 * Why an address record must not be shown, copied or offered as a payment target: the indexer's
 * resolver reports it invalid, or it fails the SDK's validation for its key. Null when it can be.
 */
export function addressRecordIssue(record: AddressRecord) {
  if (record.resolverIssue) return record.resolverIssue
  return validateRecordValue(record.key, record.value)[0] ?? null
}

/** A name's Dusk addresses that may be shown or copied, by the rule "Send to" uses. */
export function trustedDuskAddresses(records: readonly AddressRecord[]) {
  return records.filter(record => record.key === 'moonlight_address' && !addressRecordIssue(record)).map(record => record.value)
}

/** A name's Dusk address that may be shown or copied, or '' when it has none that can. */
export function trustedDuskAddressOf(records: readonly AddressRecord[]) {
  return trustedDuskAddresses(records)[0] ?? ''
}

/** A Dusk address read on its own, such as from activity, by the SDK's validation. A record keeps its flag: pass it whole. */
export function trustedDuskAddress(value: string | null | undefined) {
  return value && !addressRecordIssue({ key: 'moonlight_address', value }) ? value : null
}
