export function PlanetHorizon() {
  const horizonPath = 'M -180 210 C 180 135, 480 108, 720 108 C 960 108, 1260 135, 1620 210'
  const domePath = `${horizonPath} L 1620 430 L -180 430 Z`
  const latitudeLines = [122, 138, 154, 172, 190, 210, 232, 256, 282, 310, 340, 372, 404]
  const longitudeLines = [
    -180, -110, -40, 30, 100, 170, 240, 310, 380, 450, 520, 580, 635, 685, 720, 755, 805, 860, 920, 990, 1060, 1130,
    1200, 1270, 1340, 1410, 1480, 1550, 1620,
  ]

  return (
    <div className="planet-horizon" aria-hidden="true">
      <svg viewBox="0 0 1440 420" preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id="planet-dome-fill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1d162b" stopOpacity="0.18" />
            <stop offset="38%" stopColor="#0b0815" stopOpacity="0.32" />
            <stop offset="74%" stopColor="#04040a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#020308" stopOpacity="1" />
          </linearGradient>

          <linearGradient id="planet-horizon-core" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d8cbff" stopOpacity="0" />
            <stop offset="34%" stopColor="#9d83ff" stopOpacity="0.58" />
            <stop offset="47%" stopColor="#d8cbff" stopOpacity="0.88" />
            <stop offset="50%" stopColor="#f2edff" stopOpacity="0.96" />
            <stop offset="53%" stopColor="#d8cbff" stopOpacity="0.88" />
            <stop offset="66%" stopColor="#9d83ff" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#d8cbff" stopOpacity="0" />
          </linearGradient>

          <radialGradient id="planet-apex-bloom" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d8cbff" stopOpacity="0.42" />
            <stop offset="44%" stopColor="#b497ff" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#6e4eea" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="planet-grid-edge-fade" cx="50%" cy="0%" r="78%">
            <stop offset="0%" stopColor="white" stopOpacity="0.82" />
            <stop offset="52%" stopColor="white" stopOpacity="0.46" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="planet-grid-depth-fade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.74" />
            <stop offset="38%" stopColor="white" stopOpacity="0.36" />
            <stop offset="76%" stopColor="white" stopOpacity="0.12" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <mask id="planet-grid-fade">
            <rect width="1440" height="420" fill="url(#planet-grid-depth-fade)" />
            <rect width="1440" height="420" fill="url(#planet-grid-edge-fade)" />
          </mask>

          <clipPath id="planet-dome-clip">
            <path d={domePath} />
          </clipPath>

          <filter id="planet-outer-glow" x="-24%" y="-260%" width="148%" height="620%">
            <feGaussianBlur stdDeviation="12" />
          </filter>

          <filter id="planet-inner-glow" x="-24%" y="-260%" width="148%" height="620%">
            <feGaussianBlur stdDeviation="4" />
          </filter>

          <filter id="planet-apex-soften" x="-100%" y="-180%" width="300%" height="420%">
            <feGaussianBlur stdDeviation="24" />
          </filter>

          <filter id="planet-apex-core-soften" x="-100%" y="-180%" width="300%" height="420%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        <path
          className="planet-horizon__dome"
          d={domePath}
          fill="url(#planet-dome-fill)"
        />

        <g className="planet-horizon__grid" clipPath="url(#planet-dome-clip)" mask="url(#planet-grid-fade)">
          {latitudeLines.map((y, index) => (
            <path
              key={`lat-${index}`}
              className="planet-horizon__latitude"
              d={`M -180 ${y} C 180 ${y - (28 + index * 5)}, 1260 ${y - (28 + index * 5)}, 1620 ${y}`}
              fill="none"
              pathLength="1"
            />
          ))}
          {longitudeLines.map((x, index) => (
            <path
              key={`lon-${index}`}
              className="planet-horizon__longitude"
              d={`M ${720 + (x - 720) * 0.025} 114 C ${720 + (x - 720) * 0.09} 176, ${720 + (x - 720) * 0.42} 314, ${x} 430`}
              fill="none"
              pathLength="1"
            />
          ))}
        </g>

        <ellipse
          className="planet-horizon__apex-bloom"
          cx="720"
          cy="120"
          rx="270"
          ry="66"
          fill="url(#planet-apex-bloom)"
          filter="url(#planet-apex-soften)"
        />

        <path
          className="planet-horizon__outer-glow"
          d={horizonPath}
          fill="none"
          filter="url(#planet-outer-glow)"
        />
        <path
          className="planet-horizon__inner-glow"
          d={horizonPath}
          fill="none"
          filter="url(#planet-inner-glow)"
        />
        <path
          className="planet-horizon__apex-core"
          d="M 584 111 C 642 105, 688 108, 720 108 C 752 108, 798 105, 856 111"
          fill="none"
          filter="url(#planet-apex-core-soften)"
        />
        <path
          className="planet-horizon__rim"
          d={horizonPath}
          fill="none"
          stroke="url(#planet-horizon-core)"
        />
      </svg>
    </div>
  )
}
