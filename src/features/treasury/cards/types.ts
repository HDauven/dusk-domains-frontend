import type { TreasuryViewProps } from '../treasuryViewTypes'
import type { FeeConfigFormState } from '../feeConfig'

export type FeeConfigField = keyof FeeConfigFormState
export type TreasuryHeaderProps = Pick<TreasuryViewProps, 'treasuryState'>
export type TreasuryAccountingCardProps = TreasuryHeaderProps
export type TreasuryClaimHistoryCardProps = TreasuryHeaderProps
export type TreasuryClaimCardProps = Pick<TreasuryViewProps, 'treasuryState' | 'claim' | 'wallet'>
export type TreasuryPricingCardProps = Pick<TreasuryViewProps, 'pricing' | 'wallet'>
