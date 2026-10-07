import { stringifyJson, type Order } from '@duskdomains/sdk'
import { namehashHex, validateName } from '../../names/internal'
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

const changedMessage = 'Marketplace state changed on-chain. Review the latest terms before trying again.'

export async function canonicalOwnedName(
  client: DuskDomainsOnChainClient,
  indexed: IndexedNameSummary,
  expectedOwner: string,
) {
  const currentBlockHeight = await required(client.getCurrentBlockHeight())
  const response = await required(client.getName(indexed.canonicalName))
  const record = response.record
  if (!response.marketplaceTransferable) {
    throw new Error('Only second-level .dusk names can be sold.')
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
    throw new Error('Offers are only available for second-level .dusk names.')
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
  const sale = await required(client.getFixedSale(indexed.node, orderIdentity(indexed)))
  if (!sale
    || !sameOrder(indexed.order, sale.order)
    || sale.saleId !== indexed.saleId
    || sale.feeBps !== indexed.feeBps
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
  const auction = await required(client.getAuction(indexed.node, orderIdentity(indexed)))
  if (!auction
    || !sameOrder(indexed.order, auction.order)
    || auction.auctionId !== indexed.auctionId
    || auction.durationBlocks !== indexed.durationBlocks
    || auction.startDeadlineBlockHeight !== indexed.startDeadlineBlockHeight
    || auction.feeBps !== indexed.feeBps
    || auction.node !== indexed.node
    || auction.name !== indexed.name
    || normalizedAuthority(auction.sellerAuthority) !== normalizedAuthority(indexed.sellerAuthority)
    || auction.reservePriceLux !== BigInt(indexed.reservePriceLux)) {
    throw new Error(changedMessage)
  }
  return auction
}

export async function canonicalOffer(
  client: DuskDomainsMarketplaceOnChainClient,
  indexed: IndexedMarketplaceOffer,
): Promise<DuskDomainsOnChainOffer> {
  if (!validateName(indexed.name).ok || namehashHex(indexed.name) !== indexed.node.toLowerCase()) {
    throw new Error('This offer does not match the displayed name. Refresh the offers before trying again.')
  }
  const offer = await required(client.getOffer(indexed.node, indexed.buyerAuthority, orderIdentity(indexed)))
  if (!offer
    || !sameOrder(indexed.order, offer.order)
    || offer.node !== indexed.node
    || normalizedAuthority(offer.buyerAuthority) !== normalizedAuthority(indexed.buyerAuthority)
    || offer.amountLux !== BigInt(indexed.amountLux)
    || offer.feeBps !== indexed.feeBps
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
  const refund = await required(client.getRefund(indexed.authority, indexed.marketplaceContractId ?? undefined))
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

function sameOrder(indexed?: Order, canonical?: Order) {
 return !indexed || Boolean(canonical && stringifyJson(indexed.terms) === stringifyJson(canonical.terms) && indexed.nonce === canonical.nonce && indexed.status === canonical.status)
}

function orderIdentity(indexed: { name: string; marketplaceContractId?: string | null; order?: Order }) {
  if (!indexed.order) return undefined
  if (!indexed.marketplaceContractId) throw new Error('The recorded marketplace is missing. Refresh before trying again.')
  return { marketplaceContractId: indexed.marketplaceContractId, name: indexed.name, order: indexed.order }
}
