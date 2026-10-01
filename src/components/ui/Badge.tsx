import type { ComponentProps } from 'react'

export type NameState = 'available' | 'taken' | 'reserved' | 'expiring' | 'grace' | 'paused'
type Tone = 'neutral' | 'success' | 'warning' | 'danger'
const labels: Record<NameState, string> = {
  available: 'Available', taken: 'Taken', reserved: 'Reserved', expiring: 'Expiring', grace: 'Grace period', paused: 'Paused',
}
const tones: Record<NameState, Tone> = {
  available: 'success', taken: 'neutral', reserved: 'neutral', expiring: 'warning', grace: 'warning', paused: 'warning',
}

export function Badge({ status, tone = 'neutral', className = '', children, ...props }: ComponentProps<'span'> & { status?: NameState, tone?: Tone }) {
  return <span {...props} className={`status-badge badge-${status ? tones[status] : tone} ${className}`} data-status={status}>{children ?? (status ? labels[status] : null)}</span>
}
