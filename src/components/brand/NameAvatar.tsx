import { useState } from 'react'

// Avatars come from on-chain records, so they are third-party URLs: https only, no referrer,
// and a dusk-toned monogram whenever the image is missing or fails.
export function NameAvatar({ name, src, size = 28 }: { name: string, src?: string | null, size?: number }) {
  const [failed, setFailed] = useState(false)
  const usable = src && /^https:\/\//.test(src) && !failed

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
      }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
