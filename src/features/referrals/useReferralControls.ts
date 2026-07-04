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
      let copied = false
      if (globalThis.navigator?.clipboard) {
        try {
          await globalThis.navigator.clipboard.writeText(referralLink)
          copied = true
        } catch {
          copied = false
        }
      }
      if (!copied && typeof globalThis.document !== 'undefined') {
        const copyTarget = globalThis.document.createElement('textarea')
        copyTarget.value = referralLink
        copyTarget.setAttribute('readonly', '')
        copyTarget.style.position = 'fixed'
        copyTarget.style.left = '-9999px'
        copyTarget.style.top = '0'
        globalThis.document.body.append(copyTarget)
        copyTarget.select()
        copied = globalThis.document.execCommand('copy')
        copyTarget.remove()
      }
      if (!copied) {
        throw new Error('Clipboard is unavailable.')
      }
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
