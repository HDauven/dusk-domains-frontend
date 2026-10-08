import { useEffect, useState, type CSSProperties } from 'react'

// Every name has its Night Card animal. Without an avatar of its own, or when that image fails,
// a name shows the same animal on a dusk circle, so it looks the same everywhere it appears.
const animals = new Map<string, Promise<string | null>>()
function animalFor(name: string) {
  let animal = animals.get(name)
  if (!animal) {
    animal = import('../../features/search/night-card/nightCardIdentity')
      .then(({ nightCardIdentity }) => nightCardIdentity(name))
      .then(identity => identity.animal, () => null)
    animals.set(name, animal)
  }
  return animal
}

// Avatars come from on-chain records, so they are third-party URLs: https only, no referrer.
export function NameAvatar({ name, src, size = 28 }: { name: string, src?: string | null, size?: number }) {
  const [failed, setFailed] = useState(false)
  const [found, setFound] = useState<{ name: string, animal: string | null } | null>(null)
  const usable = src && /^https:\/\//.test(src) && !failed
  useEffect(() => {
    if (usable) return
    let current = true
    void animalFor(name).then(animal => { if (current) setFound({ name, animal }) })
    return () => { current = false }
  }, [name, usable])

  if (usable) {
    return (
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
    )
  }
  // Undefined while the animal is still being worked out; null if it can't be.
  const animal = found?.name === name ? found.animal : undefined
  if (animal) {
    return (
      <span
        className="name-avatar animal"
        aria-hidden="true"
        data-animal={animal}
        style={{ width: size, height: size, '--animal': `url(${import.meta.env.BASE_URL}night-cards/avatars/${animal}.webp)` } as CSSProperties}
      />
    )
  }
  return (
    <span className="name-avatar monogram" aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.56 }}>
      {animal === null ? name.charAt(0).toUpperCase() : null}
    </span>
  )
}
