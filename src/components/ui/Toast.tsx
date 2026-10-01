import { Button } from './Button'

export function Toast({ message, tone = 'success', onDismiss }: { message: string, tone?: 'success' | 'danger', onDismiss?: () => void }) {
  return <span className={`toast toast-${tone}`} role={tone === 'danger' ? 'alert' : 'status'} aria-atomic="true">
    {message ? <span>{message}</span> : null}
    {message && onDismiss ? <Button variant="quiet" onClick={onDismiss} aria-label="Dismiss notification">Dismiss</Button> : null}
  </span>
}
