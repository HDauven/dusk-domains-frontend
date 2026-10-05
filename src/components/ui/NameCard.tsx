import { useId, useState, type ReactNode } from 'react'
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
  // A dead avatar link is dropped as if the name had none; a different link gets a fresh try.
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null)
  const showAvatar = avatar && /^https:\/\//.test(avatar) && avatar !== failedAvatar
  const content = <>
    <span className="name-portrait-art" aria-hidden="true">
      {/* The sun's glow at its narrowest and its widest. Breathing fades from one to the other,
          which the compositor does alone, where an animated shadow repaints every frame. */}
      <span className="name-portrait-glow" />
      <span className="name-portrait-glow" />
    </span>
    <span className="name-portrait-content" id={detailsId}>
      {showAvatar ? <img src={avatar} alt="" className="name-avatar" width={48} height={48} referrerPolicy="no-referrer" loading="lazy" onError={() => setFailedAvatar(avatar)} /> : null}
      <NameSignature name={name} fit />
      {description ? <span className="name-portrait-description">{description}</span> : null}
      {children}
    </span>
  </>
  return onOpen ? (
    <Button className={`name-portrait ${className}`} loading={loading} disabled={disabled} onClick={onOpen} aria-label={`Open ${name}`} aria-describedby={detailsId}>{content}</Button>
  ) : <article className={`name-portrait ${className}`} aria-label={name} aria-busy={loading || undefined}>{content}</article>
}
