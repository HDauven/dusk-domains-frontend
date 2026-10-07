import { useEffect, useId, useRef } from 'react'
import { useScopedState } from '../../utils/useScopedState'

export function NightCard({ name }: { name: string }) {
  const box = useRef<HTMLDivElement>(null)
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [card, setCard] = useScopedState<{ svg: string; alt: string } | null>(name, null)
  const [failed, setFailed] = useScopedState(name, false)
  useEffect(() => {
    let current = true
    const load = () => {
      void import('./night-card/renderNightCard').then(module => module.renderNightCard(name, `night-${id}`))
        .then(result => { if (current) setCard(result) })
        .catch(() => { if (current) setFailed(true) })
    }
    // SVG <image> has no portable native lazy loading. Defer the entire card until nearby.
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer?.disconnect()
        load()
      }
    }, { rootMargin: '200px' })
    if (observer && box.current) observer.observe(box.current)
    else load()
    return () => { current = false; observer?.disconnect() }
  }, [name, id, setCard, setFailed])

  return <div ref={box} className="night-card" role="img" aria-label={card?.alt ?? `Share card for ${name}`}
    aria-busy={!card && !failed} style={{ aspectRatio: '1200 / 630' }}>
    {card ? <div className="night-card-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: card.svg }} />
      : failed ? <span className="night-card-fallback">Share card unavailable</span> : null}
  </div>
}
