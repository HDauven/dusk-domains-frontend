import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  initialReferralState,
  referralStateFromInput,
  writeStoredReferralInput,
  type ReferralState,
} from './referralState'

type UseReferralControlsArgs = {
  selectedAddress: string
  setReferralError: (message: string) => void
}

function referralLinkForAddress(selectedAddress: string) {
  if (!selectedAddress || typeof globalThis.location === 'undefined') return ''
  return `${globalThis.location.origin}${globalThis.location.pathname}?ref=${encodeURIComponent(selectedAddress)}`
}

export function useReferralControls({
  selectedAddress,
  setReferralError,
}: UseReferralControlsArgs) {
  const [referralState, setReferralState] = useState<ReferralState>(() => initialReferralState())
  const [referralCopied, setReferralCopied] = useState(false)
  const referralLink = useMemo(() => referralLinkForAddress(selectedAddress), [selectedAddress])

  useEffect(() => {
    writeStoredReferralInput(referralState.valid ? referralState.input : '')
  }, [referralState.input, referralState.valid])

  const handleReferralInputChange = useCallback((value: string) => {
    setReferralCopied(false)
    setReferralState(referralStateFromInput(value))
  }, [])

  const clearReferral = useCallback(() => {
    setReferralCopied(false)
    setReferralState(referralStateFromInput(''))
  }, [])

  const copyReferralLink = useCallback(async () => {
    if (!referralLink) return
    setReferralError('')

    try {
      if (!globalThis.navigator?.clipboard) throw new Error('Clipboard is unavailable.')
      await globalThis.navigator.clipboard.writeText(referralLink)
      setReferralCopied(true)
    } catch {
      setReferralCopied(false)
      setReferralError('Copy failed. Select the referral link and copy it manually.')
    }
  }, [referralLink, setReferralError])

  const resetReferralCopied = useCallback(() => {
    setReferralCopied(false)
  }, [])

  return {
    clearReferral,
    copyReferralLink,
    handleReferralInputChange,
    referralCopied,
    referralLink,
    referralState,
    resetReferralCopied,
  }
}
