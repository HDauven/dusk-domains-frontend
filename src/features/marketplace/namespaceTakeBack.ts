import { storeTakeBackSubnamesRequest, type IndexedNameSummary } from '../../names/internal'
import { sameAuthority } from '../identity/ownerLabel'

export function sellerHeldSubnames(name: IndexedNameSummary, authority: string) {
  const purchase = name.namespacePurchase
  if (!purchase || !sameAuthority(name.owner, authority) || !sameAuthority(purchase.buyer, authority)) return []
  return (name.namespace?.subnames ?? []).filter(subname => sameAuthority(subname.owner, purchase.seller))
}

export function purchaseTakeBackCall(name: IndexedNameSummary, authority: string) {
  const subnames = sellerHeldSubnames(name, authority)
  if (!subnames.length) throw new Error('The seller no longer holds any subnames.')
  return storeTakeBackSubnamesRequest({ node: name.node, nodes: subnames.map(subname => subname.node), owner: authority, manager: authority })
}
