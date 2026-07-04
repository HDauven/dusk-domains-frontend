import { Search, X } from 'lucide-react'

export function SearchHero({
  checked,
  loading,
  onCheckAvailability,
  onQueryChange,
  query,
}: {
  checked: boolean
  loading: boolean
  onCheckAvailability: () => void
  onQueryChange: (query: string) => void
  query: string
}) {
  return (
    <section className={checked ? 'hero checked' : 'hero'} id="search" aria-labelledby="hero-heading">
      <div className="hero-copy">
        <h1 id="hero-heading">
          <span>Your identity.</span>
          <span>On Dusk.</span>
        </h1>
      </div>

      <div className="search-panel">
        <label htmlFor="name-search">Search a .dusk domain</label>
        <div className="search-row">
          <div className="name-input">
            <Search size={22} />
            <input
              id="name-search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search for your .dusk domain"
            />
            {query ? (
              <button type="button" aria-label="Clear search" onClick={() => onQueryChange('')}>
                <X size={20} />
              </button>
            ) : null}
          </div>
          <button className="primary-button" type="button" onClick={onCheckAvailability}>
            {loading ? 'Checking...' : 'Search'}
            <Search size={24} />
          </button>
        </div>
        <div className="hero-examples" aria-label="Example domains">
          <span>Examples:</span>
          <button type="button" onClick={() => onQueryChange('aurora.dusk')}>aurora.dusk</button>
          <i aria-hidden="true" />
          <button type="button" onClick={() => onQueryChange('vault.dusk')}>vault.dusk</button>
          <i aria-hidden="true" />
          <button type="button" onClick={() => onQueryChange('you.dusk')}>you.dusk</button>
        </div>
      </div>
      <p className="hero-footnote">
        Dusk Domains is the identity and routing protocol for{' '}
        <a href="https://dusk.network" target="_blank" rel="noreferrer">Dusk</a>.
      </p>
    </section>
  )
}
