import { useEffect, useEffectEvent, useRef } from 'react'
import { X } from 'lucide-react'
import { isDuskDomainTxBusy, type DuskDomainTxState } from '../../names/internal'
import { txStatusCopy, txStatusDataAttrs, userFacingTxMessage } from '../status/txStatus'
import { Button } from './Button'

/** How long a confirmed transaction's notice stays, unless someone is reading it. */
export const CONFIRMED_NOTICE_MS = 8_000

/**
 * One in-place result per action. Transaction references stay behind Details. Given `onDismiss`, a
 * finished result can be closed, and a confirmed one goes by itself after a while; a failure stays
 * until it is closed or the next action replaces it.
 */
export function ActionFeedback({ error, state, onDismiss }: { error?: string; state: DuskDomainTxState | null; onDismiss?: () => void }) {
  const notice = useRef<HTMLDivElement>(null)
  const expires = Boolean(onDismiss) && !error && state?.status === 'executed'
  // Open Details, or focus inside the notice, keep it while someone reads it.
  const expire = useEffectEvent(() => {
    const reading = Boolean(notice.current?.querySelector('details[open]') || notice.current?.contains(document.activeElement))
    if (!reading) onDismiss?.()
    return !reading
  })
  useEffect(() => {
    if (!expires) return
    let timer = setTimeout(function check() { if (!expire()) timer = setTimeout(check, CONFIRMED_NOTICE_MS) }, CONFIRMED_NOTICE_MS)
    return () => clearTimeout(timer)
  }, [expires, state])
  const dismiss = onDismiss && (error || (state && !isDuskDomainTxBusy(state)))
    ? <Button variant="quiet" className="icon-button feedback-dismiss" aria-label="Dismiss" onClick={onDismiss}><X size={18} aria-hidden="true" /></Button>
    : null
  if (error) return <div className="action-feedback"><p className="secure-note danger" role="alert">{error}</p>{dismiss}</div>
  if (!state) return null
  return <div ref={notice} className={`tx-status ${state.status}`} role="status" {...txStatusDataAttrs(state)}>
    <strong key={state.status}>{txStatusCopy(state.status, state.message)}</strong>
    {state.status !== 'executed' && userFacingTxMessage(state) ? <p>{userFacingTxMessage(state)}</p> : null}
    {state.txId ? <details><summary>Details</summary><p>{state.context.title}</p><code>{state.txId}</code></details> : null}
    {dismiss}
  </div>
}
