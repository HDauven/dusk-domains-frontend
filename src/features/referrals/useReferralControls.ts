import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  initialReferralInput,
  settleReferralInput,
  type ReferralState,
} from './referralState'

type UseReferralControlsArgs = {
  selectedAddress: string
  setReferralError: (message: string) => void
}

function referralLinkForAddress(selectedAddress: string) {
  if (!selectedAddress || typeof globalThis.location === 'undefined') return ''
  // Links land on the home page, whichever page the link was copied from.
  return `${globalThis.location.origin}/?ref=${encodeURIComponent(selectedAddress)}`
}

export function useReferralControls({
  selectedAddress,
  setReferralError,
}: UseReferralControlsArgs) {
  const [input, setInput] = useState(initialReferralInput)
  const [validatedReferral, setValidatedReferral] = useState<ReferralState>({ input: '', principal: null, valid: false, reason: '' })
  const referralState = validatedReferral.input === input
    ? validatedReferral
    : { input, principal: null, valid: false, reason: '' }
  const [referralCopied, setReferralCopied] = useState(false)
  const referralLink = useMemo(() => referralLinkForAddress(selectedAddress), [selectedAddress])

  useEffect(() => {
    let current = true
    void settleReferralInput(input, () => current).then((state) => {
      if (state) setValidatedReferral(state)
    })
    return () => { current = false }
  }, [input])

  const handleReferralInputChange = useCallback((value: string) => {
    setReferralCopied(false)
    setInput(value.trim())
  }, [])

  const clearReferral = useCallback(() => {
    setReferralCopied(false)
    setInput('')
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
      if (!copied) throw new Error('Clipboard is unavailable.')
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
