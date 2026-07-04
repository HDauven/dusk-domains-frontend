import { useMemo } from 'react'
import {
  contractPrincipalFromWalletAccount,
  principalKey,
  typedPrincipalFromWalletAccount,
} from '../../names/internal'
import type { WalletSessionModel } from './walletStatus'

export function useSelectedAuthority({
  walletSession,
}: {
  walletSession: WalletSessionModel
}) {
  const selectedAddress = walletSession.selectedAddress
  const selectedContractPrincipalResult = useMemo(
    () => selectedAddress ? contractPrincipalFromWalletAccount(selectedAddress) : null,
    [selectedAddress],
  )
  const selectedTypedPrincipalResult = useMemo(
    () => selectedAddress ? typedPrincipalFromWalletAccount(selectedAddress) : null,
    [selectedAddress],
  )
  const selectedTypedPrincipal = selectedTypedPrincipalResult?.ok ? selectedTypedPrincipalResult.principal : null
  const selectedTypedPrincipalKey = principalKey(selectedTypedPrincipal)
  const selectedContractPrincipal = selectedContractPrincipalResult?.ok ? selectedContractPrincipalResult.principal : ''
  const selectedAuthority = selectedContractPrincipal || selectedAddress
  const referralLookupKey = selectedTypedPrincipalKey || selectedAuthority

  return {
    referralLookupKey,
    selectedAddress,
    selectedAuthority,
    selectedContractPrincipal,
    selectedContractPrincipalResult,
    selectedTypedPrincipal,
    selectedTypedPrincipalKey,
    selectedTypedPrincipalResult,
    selectedWalletAddress: selectedAddress,
  }
}
