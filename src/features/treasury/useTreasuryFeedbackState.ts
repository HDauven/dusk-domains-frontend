import { useState } from 'react'
import type { DuskDomainTxState } from '../../names/internal'

export function useTreasuryFeedbackState() {
  const [treasuryTxState, setTreasuryTxState] = useState<DuskDomainTxState | null>(null)
  const [treasuryConfirmation, setTreasuryConfirmation] = useState('')
  const [feeConfigTxState, setFeeConfigTxState] = useState<DuskDomainTxState | null>(null)
  const [feeConfigUpdateError, setFeeConfigUpdateError] = useState('')
  const [feeConfigConfirmation, setFeeConfigConfirmation] = useState('')

  return {
    feeConfigConfirmation,
    feeConfigTxState,
    feeConfigUpdateError,
    setFeeConfigConfirmation,
    setFeeConfigTxState,
    setFeeConfigUpdateError,
    setTreasuryConfirmation,
    setTreasuryTxState,
    treasuryConfirmation,
    treasuryTxState,
  }
}
