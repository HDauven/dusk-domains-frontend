import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react'
import { PanelMessage } from '../../components/ui/PanelMessage'
import type { IndexedNameSummary, PendingNameReservation } from '../../names/internal'
import { abbreviate, pluralize } from '../../utils/format'
import { NameCard } from './my-domains/NameCard'
import { PendingReservationsList } from './my-domains/PendingReservationsList'

export type MyNamePrimarySummary = {
  label: string
  tone: 'success' | 'warning' | 'muted'
}

export type MyDomainsViewProps = {
  currentBlockHeight: number | null
  loading: boolean
  myNames: IndexedNameSummary[]
  myNamesError: string
  onConnectWallet: () => void
  onForgetPendingReservation: (reservation: PendingNameReservation) => void
  onOpenIndexedName: (name: string) => void
  onOpenPendingReservation: (reservation: PendingNameReservation) => void
  onRefresh: () => void
  onSearchHome: () => void
  pendingReservations: PendingNameReservation[]
  primarySummaries: Record<string, MyNamePrimarySummary>
  selectedAddress: string
}

// Everything the connected wallet holds: claims still in progress first, then its names.
export function MyDomainsView({
  currentBlockHeight,
  loading,
  myNames,
  myNamesError,
  onConnectWallet,
  onForgetPendingReservation,
  onOpenIndexedName,
  onOpenPendingReservation,
  onRefresh,
  onSearchHome,
  pendingReservations,
  primarySummaries,
  selectedAddress,
}: MyDomainsViewProps) {
  const empty = myNames.length === 0 && pendingReservations.length === 0
  const primaryCount = myNames.filter((name) => primarySummaries[name.node]?.tone === 'success').length

  return (
    <section className="my-names-panel" id="my-names" aria-labelledby="my-names-heading">
      <header className="my-names-header">
        <div>
          <h1 id="my-names-heading">My names</h1>
          <p>
            {selectedAddress ? <>Held by <code>{abbreviate(selectedAddress)}</code></> : 'Connect a wallet to see the names it holds.'}
            {myNames.length ? <> · {myNames.length} {pluralize(myNames.length, 'name')}{primaryCount ? ` · ${primaryCount} primary` : ''}</> : null}
          </p>
        </div>
        {selectedAddress ? (
          <button className="commit-button" disabled={loading} type="button" onClick={onRefresh}>
            <RefreshCw size={15} className={loading ? 'spin' : undefined} /> {loading ? 'Refreshing' : 'Refresh'}
          </button>
        ) : null}
      </header>

      {myNamesError ? <PanelMessage icon={<AlertTriangle size={18} />}>{myNamesError}</PanelMessage> : null}

      {pendingReservations.length ? (
        <PendingReservationsList
          currentBlockHeight={currentBlockHeight}
          onForgetPendingReservation={onForgetPendingReservation}
          onOpenPendingReservation={onOpenPendingReservation}
          pendingReservations={pendingReservations}
        />
      ) : null}

      {myNames.length && pendingReservations.length ? <h2 className="eyebrow my-names-section">Names</h2> : null}

      {myNames.length ? (
        <div className="name-card-grid">
          {myNames.map((name) => (
            <NameCard
              key={name.node}
              currentBlockHeight={currentBlockHeight}
              name={name}
              onOpen={onOpenIndexedName}
              primary={primarySummaries[name.node]}
            />
          ))}
        </div>
      ) : null}

      {loading && empty ? (
        <div className="name-card-grid" aria-busy="true" aria-label="Loading names">
          {[0, 1, 2].map((index) => <div className="name-card skeleton" key={index} />)}
        </div>
      ) : empty && !myNamesError ? (
        <div className="my-names-empty">
          <div className="my-names-empty-orb" aria-hidden="true" />
          <h2>{selectedAddress ? 'No names here yet' : 'Your names live here'}</h2>
          <p>{selectedAddress ? 'This wallet doesn’t hold any names. The good ones go first.' : 'Connect the wallet that holds them, or find your first one.'}</p>
          <div className="my-names-empty-actions">
            {selectedAddress ? null : (
              <button className="primary-button compact" type="button" onClick={onConnectWallet}>
                Connect wallet
              </button>
            )}
            <button className={selectedAddress ? 'primary-button compact' : 'commit-button'} type="button" onClick={onSearchHome}>
              Find a name <ArrowRight size={17} />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
