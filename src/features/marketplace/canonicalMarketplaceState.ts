import type {
  DuskDomainsMarketplaceOnChainClient,
  DuskDomainsOnChainClient,
  DuskDomainsOnChainAuction,
  DuskDomainsOnChainFixedSale,
  DuskDomainsOnChainOffer,
  DuskDomainsOnChainRefund,
  IndexedMarketplaceAuction,
  IndexedMarketplaceFixedSale,
  IndexedMarketplaceOffer,
  IndexedMarketplaceRefund,
  IndexedNameSummary,
} from '../../names/internal'

const changedMessage = 'Marketplace state changed on-chain. Refresh and try again.'

export async function canonicalOwnedName(
  client: DuskDomainsOnChainClient,
  indexed: IndexedNameSummary,
  expectedOwner: string,
) {
  const currentBlockHeight = await required(client.getCurrentBlockHeight())
  const response = await required(client.getName(indexed.canonicalName))
  const record = response.record
  if (!response.marketplaceTransferable) {
    throw new Error('Only second-level domains without subdomains can be sold.')
  }
  if (!record
    || response.node !== indexed.node
    || response.canonicalName !== indexed.canonicalName
    || normalizedAuthority(record.owner) !== normalizedAuthority(expectedOwner)
    || currentBlockHeight >= record.lifecycle.expiresAtBlock) {
    throw new Error(changedMessage)
  }
  return { ...response, currentBlockHeight }
}

export async function canonicalOfferTarget(
  client: DuskDomainsOnChainClient,
  name: string,
  expectedNode: string,
  buyerAuthority: string,
) {
  const currentBlockHeight = await required(client.getCurrentBlockHeight())
  const response = await required(client.getName(name))
  const record = response.record
  if (!record) {
    throw new Error(`${name} is not registered on this network.`)
  }
  if (!response.marketplaceTransferable) {
    throw new Error('Offers are only available for second-level domains without subdomains.')
  }
  if (response.node !== expectedNode
    || response.canonicalName !== name
    || currentBlockHeight >= record.lifecycle.expiresAtBlock
    || normalizedAuthority(record.owner) === normalizedAuthority(buyerAuthority)) {
    throw new Error(changedMessage)
  }
  return { ...response, currentBlockHeight }
}

export async function canonicalFixedSale(
  client: DuskDomainsMarketplaceOnChainClient,
  indexed: IndexedMarketplaceFixedSale,
): Promise<DuskDomainsOnChainFixedSale> {
  const sale = await required(client.getFixedSale(indexed.node))
  if (!sale
    || sale.node !== indexed.node
    || sale.name !== indexed.name
    || normalizedAuthority(sale.sellerAuthority) !== normalizedAuthority(indexed.sellerAuthority)
    || sale.priceLux !== BigInt(indexed.priceLux)
    || normalizedOptionalAuthority(sale.privateBuyer) !== normalizedOptionalAuthority(indexed.privateBuyer)
    || sale.expiresAtBlock !== indexed.expiresAtBlockHeight) throw new Error(changedMessage)
  return sale
}

export async function canonicalAuction(
  client: DuskDomainsMarketplaceOnChainClient,
  indexed: IndexedMarketplaceAuction,
): Promise<DuskDomainsOnChainAuction> {
  const auction = await required(client.getAuction(indexed.node))
  if (!auction
    || auction.node !== indexed.node
    || auction.name !== indexed.name
    || normalizedAuthority(auction.sellerAuthority) !== normalizedAuthority(indexed.sellerAuthority)
    || auction.reservePriceLux !== BigInt(indexed.reservePriceLux)
    || auction.startBlock !== indexed.startBlockHeight
    || auction.endBlock !== indexed.endBlockHeight
    || auction.bidCount !== indexed.bidCount
    || normalizedOptionalAuthority(auction.highestBid?.bidderAuthority ?? null)
      !== normalizedOptionalAuthority(indexed.highestBid?.bidderAuthority ?? null)
    || (auction.highestBid?.amountLux ?? null)
      !== (indexed.highestBid ? BigInt(indexed.highestBid.amountLux) : null)) {
    throw new Error(changedMessage)
  }
  return auction
}

export async function canonicalOffer(
  client: DuskDomainsMarketplaceOnChainClient,
  indexed: IndexedMarketplaceOffer,
): Promise<DuskDomainsOnChainOffer> {
  const offer = await required(client.getOffer(indexed.node, indexed.buyerAuthority))
  if (!offer
    || offer.node !== indexed.node
    || normalizedAuthority(offer.buyerAuthority) !== normalizedAuthority(indexed.buyerAuthority)
    || offer.amountLux !== BigInt(indexed.amountLux)
    || offer.expiresAtBlock !== indexed.expiresAtBlockHeight) throw new Error(changedMessage)
  return offer
}

export async function canonicalOfferAbsent(
  client: DuskDomainsMarketplaceOnChainClient,
  node: string,
  buyerAuthority: string,
) {
  const offer = await required(client.getOffer(node, buyerAuthority))
  if (offer) throw new Error(changedMessage)
}

export async function canonicalRefund(
  client: DuskDomainsMarketplaceOnChainClient,
  indexed: IndexedMarketplaceRefund,
): Promise<DuskDomainsOnChainRefund> {
  const refund = await required(client.getRefund(indexed.authority))
  if (!refund
    || normalizedAuthority(refund.authority) !== normalizedAuthority(indexed.authority)
    || refund.amountLux !== BigInt(indexed.amountLux)) throw new Error(changedMessage)
  return refund
}

export function minimumCanonicalBidLux(auction: DuskDomainsOnChainAuction): bigint {
  const previous = auction.highestBid?.amountLux
  if (previous == null) return auction.reservePriceLux
  return (previous * 10_500n + 9_999n) / 10_000n
}

async function required<T>(resultPromise: Promise<{ ok: true; value: T } | { ok: false; error: { message: string } }>) {
  const result = await resultPromise
  if (!result.ok) throw new Error(`Could not verify marketplace state on-chain: ${result.error.message}`)
  return result.value
}

function normalizedAuthority(value: string) {
  return value.trim().toLowerCase().replace(/^0x/u, '')
}

function normalizedOptionalAuthority(value: string | null) {
  return value == null ? null : normalizedAuthority(value)
}
