import type { DuskDomainsRuntimeConfig } from '../names/internal'

export function NetworkStatus({ config, message = null, readOnly = config.mode !== 'live_ready' || !config.liveWritesEnabled }: { config: DuskDomainsRuntimeConfig; message?: string | null; readOnly?: boolean }) {
  const preview = config.mode !== 'live_ready'
  const details = config.warnings.length || config.missingLiveInputs.length
  if (!preview && !message && !details && !readOnly) return null
  return <aside className={`network-status${preview || message ? ' network-notice' : ''}`} aria-label="Network data">
    {preview ? <p><strong>Preview — read only.</strong> Availability and prices are examples. No names can be registered here.</p> : message || readOnly ? <p role={message ? 'status' : undefined}>{message}{readOnly ? `${message ? ' · ' : ''}Read only` : ''}</p> : null}
    {details ? <details><summary>Details</summary>
      {config.missingLiveInputs.length ? <p>Live configuration missing: {config.missingLiveInputs.join(', ')}</p> : null}
      {config.warnings.map(warning => <p key={warning}>{warning}</p>)}
    </details> : null}
  </aside>
}
