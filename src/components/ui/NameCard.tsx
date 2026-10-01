import { useId, type ReactNode } from 'react'
import { Button } from './Button'
import { NameSignature } from './NameChip'

export function NameCard({ name, avatar, description, children, onOpen, loading, disabled, className = '' }: {
  name: string
  avatar?: string | null
  description?: string | null
  children?: ReactNode
  onOpen?: () => void
  loading?: boolean
  disabled?: boolean
  className?: string
}) {
  const detailsId = useId()
  const content = <>
    <span className="name-portrait-art" aria-hidden="true" />
    <span className="name-portrait-content" id={detailsId}>
      {avatar && /^https:\/\//.test(avatar) ? <img src={avatar} alt="" className="name-avatar" width={48} height={48} referrerPolicy="no-referrer" loading="lazy" onError={(event) => { event.currentTarget.hidden = true }} /> : null}
      <NameSignature name={name} fit />
      {description ? <span className="name-portrait-description">{description}</span> : null}
      {children}
    </span>
  </>
  return onOpen ? (
    <Button className={`name-portrait ${className}`} loading={loading} disabled={disabled} onClick={onOpen} aria-label={`Open ${name}`} aria-describedby={detailsId}>{content}</Button>
  ) : <article className={`name-portrait ${className}`} aria-label={name} aria-busy={loading || undefined}>{content}</article>
}
