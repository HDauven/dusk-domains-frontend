// App presentation / HTTP view model, ported from SDK 0.2.0 (MIT).
import type { CoreFeeConfig } from './ui/names'
import type { DuskPrincipal } from './principals'
import type { RecordVisibility, ResolverRecordKey } from './ui/records'
import type { DuskEndpoint, DuskDomainsResult } from './http/results'
import type { DuskDomainCallMetadata } from './commands'

export type DuskDomainsRecordKeyAlias = 'dusk_public_address' | 'dusk_shielded_address'
export type DuskDomainsOnChainRecordKey = ResolverRecordKey | DuskDomainsRecordKeyAlias

export type DuskDomainsOnChainReadTransport = {
  client?: Promise<import('@duskdomains/sdk').FrozenClient>
  read: (call: DuskDomainCallMetadata) => Promise<unknown>
  /** Whether `client` is still the one reads use: false once it was discarded, such as after a failed verification. */
  isCurrentClient?: (client: unknown) => boolean
}

export type DuskDomainsOnChainClientOptions = {
  read: DuskDomainsOnChainReadTransport
  defaultRecordKeys?: DuskDomainsOnChainRecordKey[]
  currentBlockHeight?: number | (() => number | null | Promise<number | null>)
}

export type DuskDomainsOnChainLifecycle = {
  expiresAtBlock: number
  graceEndsAtBlock: number
}

export type DuskDomainsOnChainNameRecord = {
  label: string
  owner: string
  manager: string
  lifecycle: DuskDomainsOnChainLifecycle
  referrer: DuskPrincipal | null
}

export type DuskDomainsOnChainNameResponse = {
  store?: string
  ref?: import('@duskdomains/sdk').NameRef | null
  canonicalName: string | null
  marketplaceTransferable: boolean
  node: string
  record: DuskDomainsOnChainNameRecord | null
}

export type DuskDomainsOnChainRecord = {
  key: ResolverRecordKey
  value: string
  visibility: RecordVisibility
  ttlSeconds: number
  updatedAtBlock: number
}

export type DuskDomainsOnChainResolvedName = {
  canonicalName: string
  node: string
  endpoint: DuskEndpoint
  record: DuskDomainsOnChainRecord
}

export type DuskDomainsOnChainPrimaryNameVerification = {
  endpoint: DuskEndpoint
  primaryName: string
  node: string
  forwardRecord: DuskDomainsOnChainRecord
  verified: true
}

/** A Dusk address's stored primary link in one store: the name it is to, whether or not that resolves. */
export type DuskDomainsOnChainPrimaryLink = {
  /** The store keeping it; only the address can clear it there. */
  store: string
  node: string
  name: string
  mappingId: string
  updatedAtBlock: number
}

export type DuskDomainsOnChainPrimaryRecord = DuskDomainsOnChainPrimaryLink & {
  endpoint: DuskEndpoint
}

/** A name set_primary would set for a Dusk address now, every precondition but uniqueness met. */
export type DuskDomainsOnChainPrimaryTarget = {
  /** The store the name lives in. */
  store: string
  /** Its key and incarnation, which the set is bound to. */
  nameRef: import('@duskdomains/sdk').NameRef
  /** The address's stored links in every store. */
  links: DuskDomainsOnChainPrimaryLink[]
}

export type DuskDomainsOnChainPendingCommitment = {
  commitment: string
  pending: {
    controller: string
    createdAtBlock: number
  } | null
}

export type DuskDomainsOnChainClient = {
  getRegistrationQuote: (
    name: string,
    years: number,
    actor: string,
  ) => Promise<DuskDomainsResult<{ store: string; quote: import('@duskdomains/sdk').RegistrationQuote }>>
  getRenewalQuote: (
    name: string,
    years: number,
  ) => Promise<
    DuskDomainsResult<{
      store: string
      quote: import('@duskdomains/sdk').RenewalQuote
      ref: import('@duskdomains/sdk').NameRef
    }>
  >
  getCurrentBlockHeight: () => Promise<DuskDomainsResult<number>>
  getName: (name: string) => Promise<DuskDomainsResult<DuskDomainsOnChainNameResponse>>
  getNameByNode: (node: string) => Promise<DuskDomainsResult<DuskDomainsOnChainNameResponse>>
  getNameOwner: (name: string) => Promise<DuskDomainsResult<string>>
  getRecords: (
    name: string,
    keys?: DuskDomainsOnChainRecordKey[],
  ) => Promise<DuskDomainsResult<DuskDomainsOnChainRecord[]>>
  getRecord: (
    name: string,
    key: DuskDomainsOnChainRecordKey,
  ) => Promise<DuskDomainsResult<DuskDomainsOnChainRecord>>
  resolveName: (
    name: string,
    key?: DuskDomainsOnChainRecordKey,
  ) => Promise<DuskDomainsResult<DuskDomainsOnChainResolvedName>>
  /** Authority-gated resolution, including incarnation, lifecycle and forward verification. */
  getPrimaryName: (endpoint: DuskEndpoint) => Promise<DuskDomainsResult<string | null>>
  /** Every store's stored link for the endpoint. A store sets a primary only while no other store has one. */
  readPrimaryLinks: (endpoint: DuskEndpoint) => Promise<DuskDomainsResult<DuskDomainsOnChainPrimaryLink[]>>
  /**
   * Whether set_primary would set a name for a Dusk address, the connected wallet's, read from the
   * chain at one height: a refusal is `not_primary_eligible`, with the reason in plain words.
   */
  checkPrimaryTarget: (name: string, address: string) => Promise<DuskDomainsResult<DuskDomainsOnChainPrimaryTarget>>
  /** Read the stored mapping for endpoint cleanup, without lifecycle or forward verification. */
  readPrimaryName: (
    endpoint: DuskEndpoint,
  ) => Promise<DuskDomainsResult<DuskDomainsOnChainPrimaryRecord | null>>
  verifyPrimaryName: (
    endpoint: DuskEndpoint,
    expectedName?: string,
  ) => Promise<DuskDomainsResult<DuskDomainsOnChainPrimaryNameVerification>>
  /**
   * Commitments are kept per controller: the same hash from another account is a separate entry.
   * Pass the name to read from the registry that registers it: a released name comes back in the
   * registry that holds it, not the active one.
   */
  getPendingCommitment: (
    controller: string,
    commitment: string,
    name?: string,
  ) => Promise<DuskDomainsResult<DuskDomainsOnChainPendingCommitment>>
  getRegistrationPremium: (name: string) => Promise<DuskDomainsResult<number>>
  getFeeConfig: () => Promise<DuskDomainsResult<CoreFeeConfig>>
}
