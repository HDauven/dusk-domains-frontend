import type { CoreFeeConfig } from './ui/names'
import type { DuskPrincipal } from '@duskdomains/sdk'
import type { ResolverRecord } from './ui/records'

export type DuskDomainContractKey = 'store' | 'vault' | 'marketplace' | 'directory' | 'resolver' | 'policy'
export type DuskDomainRequiredContractKey = 'store' | 'vault' | 'directory' | 'resolver' | 'policy'

export type DuskDomainContractPreset = {
  contractId: string
  driverUrl: string
  name: string
  methodSigs: Record<string, string>
}

export type DuskDomainContractMap = Record<DuskDomainRequiredContractKey, DuskDomainContractPreset> &
  Partial<Record<'marketplace', DuskDomainContractPreset>>

export type DuskDomainCallKind = 'read' | 'write'

export type ReviewedAuthorityRecipient = { name?: string; address: string }
/** The owner a renewal of someone else's name was reviewed for, and its listing, if listed. */
export type ReviewedRenewal = { owner: string; listing: { marketplace: string; orderId: string } | null }

export type DuskDomainCallMetadata<TArgs = unknown> = {
  /** Presentation only; reassignment and take-back use the same contract call. */
  authorityAction?: 'reassign' | 'take_back'
  /** Addresses are checked against the signed authorities; names are also re-resolved on chain. */
  reviewedRecipient?: ReviewedAuthorityRecipient & { kind: 'transfer' | 'manager' }
  reviewedAuthorities?: { owner: ReviewedAuthorityRecipient; manager: ReviewedAuthorityRecipient }
  /** Display only; removal always includes every descendant, even if not listed here. */
  knownDescendants?: string[]
  reviewedOrder?: import('@duskdomains/sdk').Order
  /** The registration quote shown when Register was pressed; the reveal signs only this price. */
  quote?: import('@duskdomains/sdk').RegistrationQuote
  /** What the reservation was priced at, kept with it; a policy replacement since then needs confirming. */
  reservedQuote?: import('./registrationQuote').ReviewedRegistrationQuote
  nameRef?: import('@duskdomains/sdk').NameRef
  /**
   * What a renewal of a name someone else holds was offered for: the owner reviewed and, for a listed
   * name, the market holding it and the order it is listed by. The holder's own renewal has none.
   */
  reviewedRenewal?: ReviewedRenewal
  /** The primary link a clear was reviewed for: the name it is to, the store holding it and its mapping. */
  reviewedPrimary?: { name: string; store: string; mappingId: string }
  expectedFeeBps?: number
  expectedRecipient?: string
  expectedScheduleVersion?: bigint
  contract: DuskDomainContractKey
  functionName: string
  kind: DuskDomainCallKind
  args: TArgs
  /** Original commitment store or reviewed marketplace identity. */
  contractId?: string
}

export type DuskDomainDecodedContext = {
  title: string
  description: string
  fields: Array<{
    label: string
    value: string
  }>
}

export type DuskDomainGas = {
  limit: bigint | string
  price?: bigint | string
}

export type DuskConnectAppLike = {
  /** Current chain identity. Required for preparation; reads are uncached when unavailable. */
  prepareIntent?: (
    request: DuskDomainCallMetadata,
    name: string,
  ) => Promise<import('./transactions').WalletFrozenCall>
  client?: Promise<import('@duskdomains/sdk').FrozenClient>
  /** Whether `client` is still the current one: false once it was discarded, such as after a failed verification. */
  isCurrentClient?: (client: unknown) => boolean
  readonly chainId?: string
  readContract: (params: {
    contract: DuskDomainContractPreset
    functionName: string
    args?: unknown
    decodedContext?: DuskDomainDecodedContext
  }) => Promise<unknown>
  prepareContractCall: (params: {
    contract: DuskDomainContractPreset
    functionName: string
    args?: unknown
    deposit?: string
    decodedContext?: DuskDomainDecodedContext
  }) => Promise<unknown>
  writeContract: (params: {
    display?: import('./walletCallDetails').WalletCallDetails
    contract: DuskDomainContractPreset
    functionName: string
    args?: unknown
    deposit?: string
    decodedContext?: DuskDomainDecodedContext
    preparedCall?: unknown
    gas?: DuskDomainGas
  }) => Promise<unknown>
}

/** App actions identify a name by node; the adapter resolves its current home. */
export type PoolNodeArgs = {
  node: string
}

/** Read-only fee editor shape retained for existing presentation. */
export type RouterSetFeeConfigRuntimeArgs = Omit<CoreFeeConfig, 'version' | 'updatedAt'>

export type CoreCommitRuntimeArgs = {
  commitment: string
}

export type CoreCompleteRegistrationRuntimeArgs = {
  commitHeight?: number
  commitmentStore?: string
  directory?: string
  actor?: string
  commitment: string
  secret: string
  node: string
  label: string
  durationYears: number
  feeLux: number
  records: ResolverRecord[]
  primaryEndpoint?: {
    endpointType: string
    endpointValue: string
  } | null
  referrer?: DuskPrincipal | null
}

export type CoreRenewRuntimeArgs = {
  node: string
  durationYears: number
  feeLux: number
}

export type CoreTakeBackSubnamesRuntimeArgs = {
  node: string
  nodes: string[]
  owner: string
  manager: string
}

export type CoreUpdateAuthoritiesRuntimeArgs = {
  node: string
  owner: string
  manager: string
  /** Clear this name's records and primary name; defaults to false. Descendants are untouched. */
  clearRecords?: boolean
}

export type CoreEscrowFixedSaleRuntimeArgs = {
  node: string
  marketplaceContract: string
  name: string
  priceLux: number
  privateBuyer?: string | null
  expiresAt: number
  sellerRecipient: string
}

export type CoreEscrowAuctionRuntimeArgs = {
  node: string
  marketplaceContract: string
  name: string
  reservePriceLux: number
  durationBlocks: number
  sellerRecipient: string
}

export type CoreAcceptMarketplaceOfferRuntimeArgs = {
  node: string
  marketplaceContract: string
  buyerAuthority: string
  /** The immutable placement and terms shown to the seller. */
  expectedOfferId: number
  expectedFeeBps: number
  expectedAmountLux: number
  sellerRecipient: string
}

export type CoreRecordMutationInput =
  | {
      action: 'set'
      key: string
      value: string
      ttlSeconds: number
    }
  | {
      action: 'clear'
      key: string
    }

export type CoreMutateRecordsSenderRuntimeArgs = {
  node: string
  mutations: CoreRecordMutationInput[]
}

export type CoreSetPrimaryNameRuntimeArgs = {
  endpointType: string
  endpointValue: string
  node: string
  name: string
}

export type CoreClearPrimaryNameRuntimeArgs = {
  endpointType: string
  endpointValue: string
}

export type CoreCreateSubnameRuntimeArgs = {
  parentNode: string
  node: string
  parentName: string
  name: string
  label: string
  owner: string
  manager: string
  expiresAt: number
  expiryPolicy: string
}

export type TreasuryClaimRuntimeArgs = {
  amountLux: number
}

export type TreasuryClaimReferralRewardRuntimeArgs = {
  amountLux: number
  recipient: string
}

export type TreasuryClaimAllReferralRewardsRuntimeArgs = {
  recipient: string
}

export type MarketplaceBuyFixedSaleRuntimeArgs = {
  expectedSaleId: number
  node: string
  priceLux: number
  buyerManager?: string | null
}

export type MarketplacePlaceBidRuntimeArgs = {
  expectedAuctionId: number
  node: string
  amountLux: number
  bidderManager?: string | null
}

export type MarketplaceFixedSaleArgs = MarketplaceAuctionNodeArgs & { expectedSaleId: number }
export type MarketplaceReviewedAuctionArgs = MarketplaceAuctionNodeArgs & { expectedAuctionId: number }
export type MarketplaceSettleAuctionRuntimeArgs = MarketplaceReviewedAuctionArgs
export type MarketplaceCancelOfferRuntimeArgs = MarketplaceAuctionNodeArgs & { expectedOfferId: number }
export type MarketplaceExpireOfferRuntimeArgs = MarketplaceOfferArgs & { expectedOfferId: number }

export type MarketplaceAuctionNodeArgs = {
  node: string
}

export type MarketplacePlaceOfferRuntimeArgs = {
  node: string
  amountLux: number
  expiresAt: number
  buyerManager?: string | null
}

export type MarketplaceOfferArgs = {
  node: string
  buyerAuthority: string
}

/** Operator-only pause switches; repeated values are authorized no-ops. */
