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

/** What a name's page shows, read from the chain at one height. */
export type DuskDomainsOnChainNamePage = {
  name: DuskDomainsOnChainNameResponse
  /** Every record the name holds; none for a name no store holds. */
  records: DuskDomainsOnChainRecord[]
  /** The verified primary name of the name's own Dusk address record, if it has one. */
  primaryName: string | null
  /** Why that primary couldn't be verified, if it couldn't; the rest of the page stands. */
  primaryError: string | null
}

export type DuskDomainsOnChainPendingCommitment = {
  commitment: string
  pending: {
    controller: string
    createdAtBlock: number
  } | null
}

// `homeHint` is the store an indexer row names as the name's home (`homeShard`): where to read first.
export type DuskDomainsOnChainClient = {
  /** A registration quote to show; Register quotes again and signs only that quote. */
  getRegistrationQuote: (
    name: string,
    years: number,
    actor: string,
    homeHint?: string,
  ) => Promise<DuskDomainsResult<{ store: string; quote: import('@duskdomains/sdk').RegistrationQuote }>>
  getRenewalQuote: (
    name: string,
    years: number,
    homeHint?: string,
  ) => Promise<
    DuskDomainsResult<{
      store: string
      quote: import('@duskdomains/sdk').RenewalQuote
      ref: import('@duskdomains/sdk').NameRef
    }>
  >
  getCurrentBlockHeight: () => Promise<DuskDomainsResult<number>>
  getName: (name: string, homeHint?: string) => Promise<DuskDomainsResult<DuskDomainsOnChainNameResponse>>
  /** The name, its records and the verified primary of its Dusk address record, at one height. */
  getNamePage: (name: string, homeHint?: string) => Promise<DuskDomainsResult<DuskDomainsOnChainNamePage>>
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
  /**
   * Authority-gated resolution, including incarnation, lifecycle and forward verification. `homeHint` is
   * the store keeping the mapping: the home of the primary name.
   */
  getPrimaryName: (endpoint: DuskEndpoint, homeHint?: string) => Promise<DuskDomainsResult<string | null>>
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
    homeHint?: string,
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
  getRegistrationPremium: (name: string, homeHint?: string) => Promise<DuskDomainsResult<number>>
  getFeeConfig: () => Promise<DuskDomainsResult<CoreFeeConfig>>
}
