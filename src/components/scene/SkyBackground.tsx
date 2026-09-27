import { useMemo } from 'react'

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

export function SkyBackground({ names = [], onOpenName }: { names?: SkyName[], onOpenName?: (label: string) => void }) {
  const stars = useMemo(() => names.slice(0, 300).map((name) => {
    const { x, y } = namePosition(name.node)
    return { label: name.label, left: `${4 + x * 92}%`, top: `${7 + y * 46}%` }
  }), [names])

  return (
    <div className="sky" aria-hidden="true">
      <svg className="sky-dust" viewBox="0 0 100 62" preserveAspectRatio="none" focusable="false">
        {dust.map((star, index) => (
          <circle key={index} cx={star.x} cy={star.y} r={star.r / 10} fill="#fff" opacity={star.o} />
        ))}
      </svg>
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
