import { useState } from 'react'
import type { DuskNameTxState } from '../../names/internal'

export function useTreasuryFeedbackState() {
  const [treasuryTxState, setTreasuryTxState] = useState<DuskNameTxState | null>(null)
  const [treasuryConfirmation, setTreasuryConfirmation] = useState('')
  const [feeConfigTxState, setFeeConfigTxState] = useState<DuskNameTxState | null>(null)
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
