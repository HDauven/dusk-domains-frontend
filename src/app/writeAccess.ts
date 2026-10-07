import type { DuskConnectAppLike, DuskDomainCallMetadata, DuskDomainsRuntimeConfig } from '../names/internal'
import { pauseReason, type OperatorPause } from './operatorPause'

export function createWriteAccess(config: Pick<DuskDomainsRuntimeConfig, 'mode' | 'liveWritesEnabled'>, app: DuskConnectAppLike | null, pause: OperatorPause) {
  const readOnly = !app || config.mode !== 'live_ready' || !config.liveWritesEnabled
  const reason = (call: Pick<DuskDomainCallMetadata, 'contract' | 'functionName'>) => readOnly
    ? 'Preview is read only. No transaction was sent.'
    : pauseReason(call, pause)
  return { readOnly, reason, canRegister: !reason({ contract: 'store', functionName: 'commit' }) }
}
