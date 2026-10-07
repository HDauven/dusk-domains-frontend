import type { DuskDomainsResult } from './http/results'
/** Canonical contract-read transport used by the marketplace read client. */
export type DuskDomainsMarketplaceReadTransport = {
  read: (call: import('./commands').DuskDomainCallMetadata) => Promise<unknown>
}

/** Canonical fixed-price sale stored by the marketplace contract. */
export type DuskDomainsOnChainFixedSale = {
  order?: import('@duskdomains/sdk').Order
  returnPending?: boolean
  saleId: number
  feeBps: number
  openedAtBlockHeight: number
  node: string
  name: string
  sellerAuthority: string
  priceLux: bigint
  privateBuyer: string | null
  expiresAtBlock: number
  domainExpiresAtBlock: number
}

/** Canonical highest bid stored inside an active auction. */
export type DuskDomainsOnChainAuctionBid = {
  bidderAuthority: string
  amountLux: bigint
  placedAtBlock: number
}

/** Canonical reserve auction stored by the marketplace contract. */
export type DuskDomainsOnChainAuction = {
  order?: import('@duskdomains/sdk').Order
  returnPending?: boolean
  auctionId: number
  durationBlocks: number
  startDeadlineBlockHeight: number
  createdAtBlockHeight: number
  feeBps: number
  node: string
  name: string
  sellerAuthority: string
  reservePriceLux: bigint
  startBlock: number | null
  endBlock: number | null
  highestBid: DuskDomainsOnChainAuctionBid | null
  bidCount: number
}

/** Canonical domain offer stored by the marketplace contract. */
export type DuskDomainsOnChainOffer = {
  order?: import('@duskdomains/sdk').Order
  offerId: number
  feeBps: number
  node: string
  buyerAuthority: string
  amountLux: bigint
  expiresAtBlock: number
}

/** Canonical aggregate pull-payment refund stored for one authority. */
export type DuskDomainsOnChainRefund = {
  authority: string
  amountLux: bigint
}

export type MarketplaceOrderIdentity = {
  marketplaceContractId: string
  name: string
  order: import('@duskdomains/sdk').Order
}

/** Exact-key marketplace reads used to verify indexer state before signing. */
export type DuskDomainsMarketplaceOnChainClient = {
  getFixedSale: (node: string, identity?: MarketplaceOrderIdentity) => Promise<DuskDomainsResult<DuskDomainsOnChainFixedSale | null>>
  getAuction: (node: string, identity?: MarketplaceOrderIdentity) => Promise<DuskDomainsResult<DuskDomainsOnChainAuction | null>>
  getOffer: (
    node: string,
    buyerAuthority: string,
    identity?: MarketplaceOrderIdentity,
  ) => Promise<DuskDomainsResult<DuskDomainsOnChainOffer | null>>
  getRefund: (authority: string, marketplaceContractId?: string) => Promise<DuskDomainsResult<DuskDomainsOnChainRefund | null>>
}
