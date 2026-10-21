import { WebsiteBadge } from '../../components/ui/WebsiteBadge'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Search, X } from 'lucide-react'
import { NameChip } from '../../components/ui/NameChip'
import type { ShowcaseName } from '../../app/useSkyNames'

const amount = (price: string) => Number(price.replace(/,/g, ''))

export function SearchHero({
  checked,
  priceTiers,
  pricingRules,
  featuredNames = [],
  loading,
  onCheckAvailability,
  onOpenName,
  onQueryChange,
  query,
}: {
  priceTiers?: { label: string; price: string }[]
  /** Renewal, the ten-year limit and the dropped-name premium, each a sentence. */
  pricingRules?: string[]
  checked: boolean
  featuredNames?: ShowcaseName[] | null
  loading: boolean
  onCheckAvailability: () => void
  onOpenName?: (name: string) => void
  onQueryChange: (query: string) => void
  query: string
}) {
  const label = query.trim().replace(/\.dusk$/i, '')

  // The cheapest tier, for the one line shown before the prices open.
  const cheapest = priceTiers?.length ? priceTiers.reduce((low, tier) => amount(tier.price) < amount(low.price) ? tier : low).price : null
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

      {!checked && (priceTiers?.length || pricingRules?.length) ? <details className="search-rules">
        <summary>{cheapest ? `From ${cheapest} DUSK a year · ` : ''}Pricing, renewals and expiry</summary>
        {priceTiers?.length ? <dl className="search-prices">{priceTiers.map(tier => <div key={tier.label}><dt>{tier.label}</dt><dd>{tier.price} DUSK / year</dd></div>)}</dl> : null}
        {pricingRules?.length ? <ul role="list">{pricingRules.map(rule => <li key={rule}>{rule}</li>)}</ul> : null}
      </details> : null}

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
                <NameChip name={entry.name} onClick={() => onOpenName?.(entry.name)} /><WebsiteBadge verification={entry.verification} compact />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
