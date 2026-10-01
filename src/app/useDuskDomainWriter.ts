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
  pause = unpaused,
  contracts,
  liveDuskDomainsApp,
}: {
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
    options: SubmitDuskDomainWriteOptions = {},
  ): Promise<DuskDomainTxState> => {
    const paused = pauseReason(call, pauseRef.current)
    if (paused) throw new Error(paused)
    if (pendingWrite.current) throw new Error('Finish the pending wallet transaction before starting another.')
    const app = liveDuskDomainsApp ?? createPreviewRegistrationApp(name)
    pendingWrite.current = true

    return await submitDuskDomainWriteCall(app, call, {
      contracts,
      ...options,
      allowUnsafePreviewCall: !liveDuskDomainsApp && options.allowUnsafePreviewCall,
    }).finally(() => { pendingWrite.current = false })
  }, [contracts, liveDuskDomainsApp])
}
