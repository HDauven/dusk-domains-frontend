import { useCallback, useEffect, useRef } from 'react'
import { pauseReason, unpaused, type OperatorPause } from './operatorPause'
import { createPreviewRegistrationApp } from './appHelpers'
import {
  submitDuskDomainWrite as submitDuskDomainWriteCall,
  type DuskConnectAppLike,
  type DuskDomainContractMap,
  type DuskDomainCallMetadata,
  type DuskDomainTxState,
  type SubmitDuskDomainWriteOptions,
} from '../names/internal'

export type SubmitNameWrite = ReturnType<typeof useDuskDomainWriter>

// One wallet write at a time; without a live app, writes go to a local preview.
export function useDuskDomainWriter({
  confirmOwnershipWrite,
  pause = unpaused,
  contracts,
  liveDuskDomainsApp,
}: {
  confirmOwnershipWrite?: (name: string, call: DuskDomainCallMetadata, kind?: 'transfer' | 'manager') => Promise<boolean> | undefined
  pause?: OperatorPause
  contracts: DuskDomainContractMap
  liveDuskDomainsApp: DuskConnectAppLike | null
}) {
  const pendingWrite = useRef(false)
  // A write can be prepared before a pause is observed; check the latest state at submit.
  const pauseRef = useRef(pause)
  useEffect(() => {
    pauseRef.current = pause
  })
  return useCallback(async (
    name: string,
    call: DuskDomainCallMetadata,
    options: SubmitDuskDomainWriteOptions & { ownershipChange?: 'transfer' | 'manager' } = {},
  ): Promise<DuskDomainTxState & { ownershipConfirmed?: boolean }> => {
    const paused = pauseReason(call, pauseRef.current)
    if (paused) throw new Error(paused)
    if (pendingWrite.current) throw new Error('Finish the pending wallet transaction before starting another.')
    const app = liveDuskDomainsApp ?? createPreviewRegistrationApp(name)
    pendingWrite.current = true
    const { ownershipChange, ...writeOptions } = options

    try {
      const state = await submitDuskDomainWriteCall(app, call, {
        contracts,
        ...writeOptions,
        allowUnsafePreviewCall: !liveDuskDomainsApp && options.allowUnsafePreviewCall,
      })
      if (liveDuskDomainsApp && state.status === 'executed') {
        const confirmation = confirmOwnershipWrite?.(name, call, ownershipChange)
        if (confirmation) return { ...state, ownershipConfirmed: await confirmation }
      }
      return state
    } finally {
      pendingWrite.current = false
    }
  }, [confirmOwnershipWrite, contracts, liveDuskDomainsApp])
}
