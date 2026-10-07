import type { Order } from '@duskdomains/sdk'

type OrderRow = {
  node: string
  marketplaceContractId?: string | null
  order?: Order
  saleId?: number
  auctionId?: number
  buyerAuthority?: string
}

/** A shard move can leave multiple orders for the same node and buyer. */
export function marketplaceOrderKey(row: OrderRow): string {
  const id = row.order?.terms.id ?? row.saleId ?? row.auctionId
  return id !== undefined && row.marketplaceContractId
    ? `${row.node}:${row.marketplaceContractId}:${id}`
    : row.buyerAuthority ? `${row.node}:${row.buyerAuthority}` : row.node
}

/** Node-only routes still select an auction; clicks retain the particular order. */
export function matchesAuctionSelection(row: OrderRow, selection: string) {
  return row.node === selection || marketplaceOrderKey(row) === selection
}

export function auctionSelection(selection: string) {
  const [node, marketplace, orderId] = selection.split(':')
  return { node, ...(marketplace && orderId ? { marketplace, orderId } : {}) }
}
