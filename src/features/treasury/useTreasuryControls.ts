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
  const [feeConfigForm, setFeeConfigForm] = useState<FeeConfigFormState>(() => feeConfigFormFromConfig(feeConfig))
  const [treasuryClaimAmount, setTreasuryClaimAmount] = useState('')

  useEffect(() => {
    globalThis.queueMicrotask(() => {
      setFeeConfigForm(feeConfigFormFromConfig(feeConfig))
    })
  }, [feeConfig])

  function handleTreasuryClaimAmountChange(value: string) {
    setTreasuryClaimAmount(value)
    setTreasuryError('')
    setTreasuryConfirmation('')
  }

  function handleFeeConfigFieldChange(field: keyof FeeConfigFormState, value: string) {
    setFeeConfigForm((current) => ({ ...current, [field]: value }))
    setFeeConfigUpdateError('')
    setFeeConfigConfirmation('')
  }

  return {
    feeConfigForm,
    handleFeeConfigFieldChange,
    handleTreasuryClaimAmountChange,
    resetTreasuryClaimAmount: () => setTreasuryClaimAmount(''),
    treasuryClaimAmount,
  }
}
