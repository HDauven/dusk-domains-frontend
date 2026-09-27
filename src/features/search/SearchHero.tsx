import { Search, X } from 'lucide-react'
import { NameAvatar } from '../../components/brand/NameAvatar'
import type { ShowcaseName } from '../../app/useSkyNames'

export function SearchHero({
  checked,
  featuredNames = [],
  loading,
  onCheckAvailability,
  onOpenName,
  onQueryChange,
  query,
}: {
  checked: boolean
  featuredNames?: ShowcaseName[]
  loading: boolean
  onCheckAvailability: () => void
  onOpenName?: (name: string) => void
  onQueryChange: (query: string) => void
  query: string
}) {
  const label = query.trim().replace(/\.dusk$/i, '')

  return (
    <section className={checked ? 'hero checked' : 'hero'} id="search" aria-labelledby="hero-heading">
      <div className="hero-copy">
        <h1 id="hero-heading">
          <span>Your name,</span>
          <em>on Dusk.</em>
        </h1>
        <p>One name for your wallet, your apps and your contracts. Claim it once and keep it for up to ten years.</p>
      </div>

      <form
        className="hero-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          if (!loading && label) onCheckAvailability()
        }}
      >
        <label htmlFor="name-search">Search a .dusk name</label>
        <div className="hero-search-field">
          <Search className="hero-search-icon" size={20} aria-hidden="true" />
          <div className="hero-search-input">
            <input
              id="name-search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="yourname"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            {label && !query.includes('.') ? <span className="hero-search-tld" aria-hidden="true">{label}<b>.dusk</b></span> : null}
          </div>
          {query ? (
            <button className="hero-search-clear" type="button" aria-label="Clear search" onClick={() => onQueryChange('')}>
              <X size={18} />
            </button>
          ) : null}
          <button className="primary-button hero-search-submit" type="submit" disabled={loading || !label}>
            {loading ? 'Checking…' : 'Search'}
          </button>
        </div>
      </form>

      {featuredNames.length > 0 ? (
        <div className="hero-showcase" aria-label="Names already on Dusk">
          <p>Already on Dusk</p>
          <ul>
            {featuredNames.map((entry) => (
              <li key={entry.name}>
                <button type="button" onClick={() => onOpenName?.(entry.name)}>
                  <NameAvatar name={entry.name} src={entry.avatar} size={26} />
                  {entry.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
