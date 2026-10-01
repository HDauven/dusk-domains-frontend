import { useCallback, useEffect, useRef } from 'react'
import type { createWriteAccess } from './writeAccess'
import {
  submitDuskDomainWrite as submitDuskDomainWriteCall,
  type DuskConnectAppLike,
  type DuskDomainContractMap,
  type DuskDomainCallMetadata,
  type DuskDomainTxState,
  type SubmitDuskDomainWriteOptions,
} from '../names/internal'

export type SubmitNameWrite = ReturnType<typeof useDuskDomainWriter>

// One wallet write at a time. Preview never submits or simulates a transaction.
export function useDuskDomainWriter({
  confirmOwnershipWrite,
  writeAccess,
  contracts,
  liveDuskDomainsApp,
}: {
  confirmOwnershipWrite?: (name: string, call: DuskDomainCallMetadata, kind?: 'transfer' | 'manager') => Promise<boolean> | undefined
  writeAccess: ReturnType<typeof createWriteAccess>
  contracts: DuskDomainContractMap
  liveDuskDomainsApp: DuskConnectAppLike | null
}) {
  const pendingWrite = useRef(false)
  // A write can be prepared before a pause is observed; check the latest state at submit.
  const accessRef = useRef(writeAccess)
  useEffect(() => {
    accessRef.current = writeAccess
  })
  return useCallback(async (
    name: string,
    call: DuskDomainCallMetadata,
    options: SubmitDuskDomainWriteOptions & { ownershipChange?: 'transfer' | 'manager' } = {},
  ): Promise<DuskDomainTxState & { ownershipConfirmed?: boolean }> => {
    const unavailable = accessRef.current.reason(call)
    if (unavailable) throw new Error(unavailable)
    if (pendingWrite.current) throw new Error('Finish the pending wallet transaction before starting another.')
    if (!liveDuskDomainsApp) throw new Error('Preview is read only. No transaction was sent.')
    const app = liveDuskDomainsApp
    pendingWrite.current = true
    const { ownershipChange, ...writeOptions } = options

    try {
      const state = await submitDuskDomainWriteCall(app, call, {
        contracts,
        ...writeOptions,
        allowUnsafePreviewCall: !liveDuskDomainsApp && options.allowUnsafePreviewCall,
      })
      if (state.status === 'executed') {
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('dusk-domains:write-confirmed'))
        const confirmation = confirmOwnershipWrite?.(name, call, ownershipChange)
        if (confirmation) return { ...state, ownershipConfirmed: await confirmation }
      }
      return state
    } finally {
      pendingWrite.current = false
    }
  }, [confirmOwnershipWrite, contracts, liveDuskDomainsApp])
}
