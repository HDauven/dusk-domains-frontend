export function HeroStarField() {
  const stars = Array.from({ length: 72 }, (_, index) => {
    const cx = 28 + ((index * 197 + (index % 9) * 37) % 1384)
    const cy = 34 + ((index * 131 + (index % 13) * 23) % 574)
    const depthFade = cy > 500 ? 0.4 : cy > 420 ? 0.62 : cy > 320 ? 0.82 : 1
    const bright = index % 23 === 0
    const medium = index % 7 === 0 || index % 17 === 0
    const radius = bright ? 1.25 : medium ? 0.95 : 0.65
    const opacity = (bright ? 0.32 : medium ? 0.22 : 0.13 + ((index % 5) * 0.018)) * depthFade
    const fill = index % 6 === 0 ? '#cdc1ff' : index % 10 === 0 ? '#8f78ff' : '#ffffff'

    return { cx, cy, fill, opacity, radius }
  })

  return (
    <div className="hero-stars" aria-hidden="true">
      <svg viewBox="0 0 1440 720" preserveAspectRatio="none" focusable="false">
        {stars.map((star, index) => (
          <circle
            key={`star-${index}`}
            cx={star.cx}
            cy={star.cy}
            r={star.radius}
            fill={star.fill}
            opacity={star.opacity.toFixed(3)}
          />
        ))}
      </svg>
    </div>
  )
}
