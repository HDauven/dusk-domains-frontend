import { useEffect, useState } from 'react'
import type { CoreFeeConfig } from '../../names/internal'
import {
  feeConfigFormFromConfig,
  type FeeConfigFormState,
} from './feeConfig'

type UseTreasuryControlsArgs = {
  feeConfig: CoreFeeConfig
  setFeeConfigConfirmation: (message: string) => void
  setFeeConfigUpdateError: (message: string) => void
  setTreasuryConfirmation: (message: string) => void
  setTreasuryError: (message: string) => void
}

export function useTreasuryControls({
  feeConfig,
  setFeeConfigConfirmation,
  setFeeConfigUpdateError,
  setTreasuryConfirmation,
  setTreasuryError,
}: UseTreasuryControlsArgs) {
  const [pricingDraft, setPricingDraft] = useState(() => {
    const form = feeConfigFormFromConfig(feeConfig)
    return { form, baseline: form }
  })
  const [treasuryClaimAmount, setTreasuryClaimAmount] = useState('')

  useEffect(() => {
    globalThis.queueMicrotask(() => {
      const baseline = feeConfigFormFromConfig(feeConfig)
      setPricingDraft(current => {
        const dirty = (Object.keys(current.form) as Array<keyof FeeConfigFormState>)
          .some(field => current.form[field] !== current.baseline[field])
        return { baseline, form: dirty ? current.form : baseline }
      })
    })
  }, [feeConfig])

  function handleTreasuryClaimAmountChange(value: string) {
    setTreasuryClaimAmount(value)
    setTreasuryError('')
    setTreasuryConfirmation('')
  }

  function handleFeeConfigFieldChange(field: keyof FeeConfigFormState, value: string) {
    setPricingDraft(current => ({ ...current, form: { ...current.form, [field]: value } }))
    setFeeConfigUpdateError('')
    setFeeConfigConfirmation('')
  }

  return {
    feeConfigForm: pricingDraft.form,
    handleFeeConfigFieldChange,
    handleTreasuryClaimAmountChange,
    resetTreasuryClaimAmount: () => setTreasuryClaimAmount(''),
    treasuryClaimAmount,
  }
}
