import { type Dispatch, type SetStateAction, useCallback, useEffect } from 'react'
import type { ManagedNameState } from './appHelpers'
import { fallbackManager, fallbackOwner } from './appHelpers'

export type UseAppWalletDefaultsArgs = {
  selectedAddress: string | undefined
  selectedAuthority: string | undefined
  setDelegateManager: Dispatch<SetStateAction<string>>
  setDraftManager: Dispatch<SetStateAction<string>>
  setDraftOwner: Dispatch<SetStateAction<string>>
  setManagedName: Dispatch<SetStateAction<ManagedNameState>>
  setRegistrationAddressInput: Dispatch<SetStateAction<string>>
  setSubnameManager: Dispatch<SetStateAction<string>>
  walletAuthorized: boolean
}

export function useAppWalletDefaults({
  selectedAddress,
  selectedAuthority,
  setDelegateManager,
  setDraftManager,
  setDraftOwner,
  setManagedName,
  setRegistrationAddressInput,
  setSubnameManager,
  walletAuthorized,
}: UseAppWalletDefaultsArgs) {
  const primeManagedOwner = useCallback((address: string | undefined) => {
    if (!address) return

    setManagedName((current) => {
      if (current.owner !== fallbackOwner) return current
      return { ...current, owner: address, manager: address }
    })
    setDraftOwner((current) => current === fallbackOwner ? address : current)
    setDraftManager((current) => current === fallbackManager ? address : current)
    setSubnameManager((current) => current === fallbackManager ? address : current)
    setDelegateManager((current) => current === '' || current === fallbackManager ? address : current)
  }, [
    setDelegateManager,
    setDraftManager,
    setDraftOwner,
    setManagedName,
    setSubnameManager,
  ])

  useEffect(() => {
    let cancelled = false
    if (walletAuthorized && selectedAuthority) {
      globalThis.queueMicrotask(() => {
        if (!cancelled) primeManagedOwner(selectedAuthority)
      })
    }
    return () => {
      cancelled = true
    }
  }, [primeManagedOwner, selectedAuthority, walletAuthorized])

  useEffect(() => {
    if (!selectedAddress) return
    let cancelled = false
    globalThis.queueMicrotask(() => {
      if (!cancelled) {
        setRegistrationAddressInput((current) => current.trim() ? current : selectedAddress)
      }
    })
    return () => {
      cancelled = true
    }
  }, [selectedAddress, setRegistrationAddressInput])
}
