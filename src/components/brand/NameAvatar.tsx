import { useState } from 'react'

function hueOf(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash % 360
}

// Avatars come from on-chain records, so they are third-party URLs: https only, no referrer,
// and a dusk-toned monogram whenever the image is missing or fails.
export function NameAvatar({ name, src, size = 28 }: { name: string, src?: string | null, size?: number }) {
  const [failed, setFailed] = useState(false)
  const usable = src && /^https:\/\//.test(src) && !failed
  const hue = hueOf(name)

  return usable ? (
    <img
      className="name-avatar"
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  ) : (
    <span
      className="name-avatar monogram"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.56,
        background: `linear-gradient(135deg, hsl(${(hue + 20) % 360} 90% 78%), hsl(${hue} 85% 64%) 50%, hsl(${(hue + 300) % 360} 80% 60%))`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
