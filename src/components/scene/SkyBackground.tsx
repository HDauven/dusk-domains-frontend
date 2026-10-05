import { useMemo, type CSSProperties } from 'react'

export type SkyName = { label: string, node: string }

// A name's star sits where its namehash puts it, so everyone sees the same sky.
function namePosition(node: string) {
  const hex = node.replace(/^0x/, '')
  return {
    x: parseInt(hex.slice(0, 8), 16) / 2 ** 32,
    y: parseInt(hex.slice(8, 16), 16) / 2 ** 32,
  }
}

const dust = Array.from({ length: 160 }, (_, index) => {
  const x = ((index * 7919) % 1000) / 10
  const y = ((index * 104729) % 620) / 10
  return { x, y, r: index % 17 === 0 ? 1.2 : index % 5 === 0 ? 0.9 : 0.6, o: 0.18 + ((index * 37) % 50) / 100 }
})

// The dust lies in three layers: one holds still and two drift slowly apart (see sky.css).
const dustLayers = [0, 1, 2].map((layer) => dust.filter((_, index) => index % 3 === layer))

// A few brighter stars in the upper sky twinkle, each on its own slow cycle.
const twinkles = [
  { x: 8, y: 14, duration: 7.3, delay: -1.1 },
  { x: 21, y: 6, duration: 9.7, delay: -4.2 },
  { x: 34, y: 24, duration: 8.1, delay: -6.5 },
  { x: 47, y: 9, duration: 11.3, delay: -2.8 },
  { x: 59, y: 27, duration: 6.7, delay: -5.3 },
  { x: 71, y: 12, duration: 10.1, delay: -7.9 },
  { x: 83, y: 21, duration: 8.9, delay: -3.4 },
  { x: 93, y: 7, duration: 12.1, delay: -9.2 },
]

export function SkyBackground({ names = [], onOpenName }: { names?: SkyName[], onOpenName?: (label: string) => void }) {
  const stars = useMemo(() => names.slice(0, 300).map((name) => {
    const { x, y } = namePosition(name.node)
    return { label: name.label, left: `${4 + x * 92}%`, top: `${7 + y * 46}%` }
  }), [names])

  return (
    <div className="sky" aria-hidden="true">
      {dustLayers.map((layer, depth) => (
        // The wrapper moves, not the svg: browsers animate an svg's transform on the main thread.
        <div key={depth} className={`sky-dust sky-dust-${depth}`}>
          <svg viewBox="0 0 100 62" preserveAspectRatio="none" focusable="false">
            {layer.map((star, index) => (
              <circle key={index} cx={star.x} cy={star.y} r={star.r / 10} fill="var(--ink)" opacity={star.o} />
            ))}
          </svg>
        </div>
      ))}
      <div className="sky-twinkles">
        {twinkles.map((star, index) => (
          <span
            key={index}
            style={{ left: `${star.x}%`, top: `${star.y}%`, '--twinkle-duration': `${star.duration}s`, '--twinkle-delay': `${star.delay}s` } as CSSProperties}
          />
        ))}
      </div>
      <div className="sky-names">
        {stars.map((star) => (
          <button
            key={star.label}
            className="sky-name"
            style={{ left: star.left, top: star.top }}
            tabIndex={-1}
            type="button"
            onClick={() => onOpenName?.(star.label)}
          >
            <span>{star.label}</span>
          </button>
        ))}
      </div>
      <div className="sky-planet" />
    </div>
  )
}
