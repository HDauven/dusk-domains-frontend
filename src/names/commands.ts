// Application intents. Only prepareFrozenCall creates executable SDK calls.
import type * as T from './commandTypes'
export type * from './commandTypes'
export function directorySetFeeConfigRequest(
  args: T.RouterSetFeeConfigRuntimeArgs,
): T.DuskDomainCallMetadata<T.RouterSetFeeConfigRuntimeArgs> {
  return { contract: 'directory', functionName: 'set_fee_config', kind: 'write', args: args }
}
export function storeCommitRequest(
  args: T.CoreCommitRuntimeArgs,
): T.DuskDomainCallMetadata<T.CoreCommitRuntimeArgs> {
  return { contract: 'store', functionName: 'commit', kind: 'write', args: args }
}
export function storeCompleteRegistrationRequest(
  args: T.CoreCompleteRegistrationRuntimeArgs,
): T.DuskDomainCallMetadata<T.CoreCompleteRegistrationRuntimeArgs> {
  return { contract: 'store', functionName: 'complete_registration', kind: 'write', args: args }
}
export function storeRenewRequest(
  args: T.CoreRenewRuntimeArgs,
): T.DuskDomainCallMetadata<T.CoreRenewRuntimeArgs> {
  return { contract: 'store', functionName: 'renew', kind: 'write', args: args }
}
export function storeUpdateAuthoritiesRequest(
  args: T.CoreUpdateAuthoritiesRuntimeArgs,
): T.DuskDomainCallMetadata<T.CoreUpdateAuthoritiesRuntimeArgs> {
  return { contract: 'store', functionName: 'update_authorities', kind: 'write', args: args }
}
export function storeEscrowFixedSaleRequest(
  args: T.CoreEscrowFixedSaleRuntimeArgs,
): T.DuskDomainCallMetadata<T.CoreEscrowFixedSaleRuntimeArgs> {
  return { contract: 'store', functionName: 'escrow_fixed_sale', kind: 'write', args: args }
}
export function storeEscrowAuctionRequest(
  args: T.CoreEscrowAuctionRuntimeArgs,
): T.DuskDomainCallMetadata<T.CoreEscrowAuctionRuntimeArgs> {
  return { contract: 'store', functionName: 'escrow_auction', kind: 'write', args: args }
}
export function storeAcceptMarketplaceOfferRequest(
  args: T.CoreAcceptMarketplaceOfferRuntimeArgs,
): T.DuskDomainCallMetadata<T.CoreAcceptMarketplaceOfferRuntimeArgs> {
  return { contract: 'store', functionName: 'accept_marketplace_offer', kind: 'write', args: args }
}
export function storeMutateRecordsSenderRequest(
  args: T.CoreMutateRecordsSenderRuntimeArgs,
): T.DuskDomainCallMetadata<T.CoreMutateRecordsSenderRuntimeArgs> {
  return { contract: 'store', functionName: 'mutate_records_sender', kind: 'write', args: args }
}
export function storeSetPrimaryNameRequest(
  args: T.CoreSetPrimaryNameRuntimeArgs,
): T.DuskDomainCallMetadata<T.CoreSetPrimaryNameRuntimeArgs> {
  return { contract: 'store', functionName: 'set_primary_name', kind: 'write', args: args }
}
export function storeClearPrimaryNameRequest(
  args: T.CoreClearPrimaryNameRuntimeArgs,
): T.DuskDomainCallMetadata<T.CoreClearPrimaryNameRuntimeArgs> {
  return { contract: 'store', functionName: 'clear_primary_name', kind: 'write', args: args }
}
export function storeCreateSubnameRequest(
  args: T.CoreCreateSubnameRuntimeArgs,
): T.DuskDomainCallMetadata<T.CoreCreateSubnameRuntimeArgs> {
  return { contract: 'store', functionName: 'create_subname', kind: 'write', args: args }
}
export function storeRemoveSubnameRequest(args: T.PoolNodeArgs): T.DuskDomainCallMetadata<T.PoolNodeArgs> {
  return { contract: 'store', functionName: 'remove_subname', kind: 'write', args: args }
}
export function storeTakeBackSubnamesRequest(
  args: T.CoreTakeBackSubnamesRuntimeArgs,
): T.DuskDomainCallMetadata<T.CoreTakeBackSubnamesRuntimeArgs> {
  return { contract: 'store', functionName: 'take_back_subnames', kind: 'write', args: args }
}
export function directoryConfigRequest(): T.DuskDomainCallMetadata {
  return { contract: 'directory', functionName: 'config', kind: 'read', args: {} }
}
export function vaultClaimRequest(
  args: T.TreasuryClaimRuntimeArgs,
): T.DuskDomainCallMetadata<T.TreasuryClaimRuntimeArgs> {
  return { contract: 'vault', functionName: 'claim', kind: 'write', args: args }
}
export function vaultClaimAllRequest(): T.DuskDomainCallMetadata {
  return { contract: 'vault', functionName: 'claim_all', kind: 'write', args: {} }
}
export function vaultClaimReferralRewardRequest(
  args: T.TreasuryClaimReferralRewardRuntimeArgs,
): T.DuskDomainCallMetadata<T.TreasuryClaimReferralRewardRuntimeArgs> {
  return { contract: 'vault', functionName: 'claim_referral_reward', kind: 'write', args: args }
}
export function vaultClaimAllReferralRewardsRequest(
  args: T.TreasuryClaimAllReferralRewardsRuntimeArgs,
): T.DuskDomainCallMetadata<T.TreasuryClaimAllReferralRewardsRuntimeArgs> {
  return { contract: 'vault', functionName: 'claim_all_referral_rewards', kind: 'write', args: args }
}
export function marketplaceBuyFixedSaleRequest(
  args: T.MarketplaceBuyFixedSaleRuntimeArgs,
): T.DuskDomainCallMetadata<T.MarketplaceBuyFixedSaleRuntimeArgs> {
  return { contract: 'marketplace', functionName: 'buy_fixed_sale', kind: 'write', args: args }
}
export function marketplaceCancelFixedSaleRequest(
  args: T.MarketplaceFixedSaleArgs,
): T.DuskDomainCallMetadata<T.MarketplaceFixedSaleArgs> {
  return { contract: 'marketplace', functionName: 'cancel_fixed_sale', kind: 'write', args: args }
}
export function marketplaceExpireFixedSaleRequest(
  args: T.MarketplaceFixedSaleArgs,
): T.DuskDomainCallMetadata<T.MarketplaceFixedSaleArgs> {
  return { contract: 'marketplace', functionName: 'expire_fixed_sale', kind: 'write', args: args }
}
export function marketplacePlaceBidRequest(
  args: T.MarketplacePlaceBidRuntimeArgs,
): T.DuskDomainCallMetadata<T.MarketplacePlaceBidRuntimeArgs> {
  return { contract: 'marketplace', functionName: 'place_bid', kind: 'write', args: args }
}
export function marketplaceCancelAuctionRequest(
  args: T.MarketplaceReviewedAuctionArgs,
): T.DuskDomainCallMetadata<T.MarketplaceReviewedAuctionArgs> {
  return { contract: 'marketplace', functionName: 'cancel_auction', kind: 'write', args: args }
}
export function marketplaceExpireAuctionRequest(
  args: T.MarketplaceReviewedAuctionArgs,
): T.DuskDomainCallMetadata<T.MarketplaceReviewedAuctionArgs> {
  return { contract: 'marketplace', functionName: 'expire_auction', kind: 'write', args: args }
}
export function marketplaceSettleAuctionRequest(
  args: T.MarketplaceSettleAuctionRuntimeArgs,
): T.DuskDomainCallMetadata<T.MarketplaceSettleAuctionRuntimeArgs> {
  return { contract: 'marketplace', functionName: 'settle_auction', kind: 'write', args: args }
}
export function marketplacePlaceOfferRequest(
  args: T.MarketplacePlaceOfferRuntimeArgs,
): T.DuskDomainCallMetadata<T.MarketplacePlaceOfferRuntimeArgs> {
  return { contract: 'marketplace', functionName: 'place_offer', kind: 'write', args: args }
}
export function marketplaceCancelOfferRequest(
  args: T.MarketplaceCancelOfferRuntimeArgs,
): T.DuskDomainCallMetadata<T.MarketplaceCancelOfferRuntimeArgs> {
  return { contract: 'marketplace', functionName: 'cancel_offer', kind: 'write', args: args }
}
export function marketplaceExpireOfferRequest(
  args: T.MarketplaceExpireOfferRuntimeArgs,
): T.DuskDomainCallMetadata<T.MarketplaceExpireOfferRuntimeArgs> {
  return { contract: 'marketplace', functionName: 'expire_offer', kind: 'write', args: args }
}
export function marketplaceClaimRefundRequest(): T.DuskDomainCallMetadata {
  return { contract: 'marketplace', functionName: 'claim_refund', kind: 'write', args: {} }
}
export const storeReassignSubnameRequest = storeUpdateAuthoritiesRequest
