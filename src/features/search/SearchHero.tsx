import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Search, X } from 'lucide-react'
import { NameChip } from '../../components/ui/NameChip'
import type { ShowcaseName } from '../../app/useSkyNames'

export function SearchHero({
  checked,
  priceTiers,
  featuredNames = [],
  loading,
  onCheckAvailability,
  onOpenName,
  onQueryChange,
  query,
}: {
  priceTiers?: { label: string; price: string }[]
  checked: boolean
  featuredNames?: ShowcaseName[] | null
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
          Find your <em>.dusk</em> name
        </h1>
        <p>One readable name for your Dusk address.</p>
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
            <Input
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
            <Button variant="quiet" className="hero-search-clear" type="button" aria-label="Clear search" onClick={() => onQueryChange('')}>
              <X size={18} />
            </Button>
          ) : null}
          <Button variant="primary" className="hero-search-submit" type="submit" disabled={!label} loading={loading}>
            {loading ? 'Checking…' : 'Search'}
          </Button>
        </div>
      </form>

      {!checked && priceTiers ? <p className="search-prices">{priceTiers.map(tier => <span key={tier.label}>{tier.label}: {tier.price} DUSK / year</span>)}</p> : null}

      {featuredNames === null ? (
        // While names load, an invisible row holds their place, so nothing below moves.
        <div className="hero-showcase pending" aria-hidden="true">
          <p>Already on Dusk</p>
          <ul>
            <li><NameChip name="aurora.dusk" /></li>
          </ul>
        </div>
      ) : featuredNames.length > 0 ? (
        <div className="hero-showcase" aria-label="Names already on Dusk">
          <p>Already on Dusk</p>
          <ul>
            {featuredNames.map((entry) => (
              <li key={entry.name}>
                <NameChip name={entry.name} onClick={() => onOpenName?.(entry.name)} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
