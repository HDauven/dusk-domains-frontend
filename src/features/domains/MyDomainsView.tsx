import { walletActionLabel, type WalletConnectionStatus } from '../wallet/walletStatus'
import { EmptyState } from '../../components/ui/EmptyState'
import { AddressChip } from '../../components/ui/AddressChip'
import { Button } from '../../components/ui/Button'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { AccountViewHeader } from '../../components/ui/AccountViewHeader'
import { PanelMessage } from '../../components/ui/PanelMessage'
import type { IndexedNameSummary, PendingNameReservation } from '../../names/internal'
import { pluralize } from '../../utils/format'
import { NameCard } from './my-domains/NameCard'
import { ListingCard, SubnameCard } from './my-domains/HeldCards'
import type { HeldListing, HeldSubname } from './myDomainsData'
import { PendingReservationsList } from './my-domains/PendingReservationsList'
import { indexedPrimaryIsActive } from './indexedPrimary'
import { trustedDuskAddressOf } from '../identity/addressTrust'

export type MyNamePrimarySummary = {
  label: string
  tone: 'success' | 'warning' | 'muted'
}

export type MyDomainsViewProps = {
  /** Names this wallet listed; the market holds them until they sell or return. */
  listings?: HeldListing[]
  /** Subnames this wallet holds under names it does not hold. */
  subnames?: HeldSubname[]
  /** Market listings could not be read, so listed names may be missing. */
  listingsUnavailable?: boolean
  currentBlockHeight: number | null
  loading: boolean
  myNames: IndexedNameSummary[]
  myNamesError: string
  onForgetPendingReservation: (reservation: PendingNameReservation) => void
  onOpenIndexedName: (name: string) => void
  onOpenPendingReservation: (reservation: PendingNameReservation, options?: { register?: boolean }) => void
  onSearchHome: () => void
  pendingReservations: PendingNameReservation[]
  /** Registrations are paused, so saved reservations can't be registered until they reopen. */
  registrationsPaused?: boolean
  primarySummaries: Record<string, MyNamePrimarySummary>
  wallet: {
    walletStatus?: WalletConnectionStatus
    onConnectWallet: () => void
    selectedAddress: string
  }
}

// Everything the connected wallet holds: claims still in progress first, then its names.
export function MyDomainsView({ listings = [], subnames = [], listingsUnavailable = false, currentBlockHeight, loading, myNames, myNamesError, onForgetPendingReservation, onOpenIndexedName, onOpenPendingReservation, onSearchHome, pendingReservations, registrationsPaused = false, primarySummaries, wallet }: MyDomainsViewProps) {
  const {
    walletStatus,
    onConnectWallet,
    selectedAddress,
  } = wallet
  const empty = myNames.length === 0 && pendingReservations.length === 0 && listings.length === 0 && subnames.length === 0
  const nameCount = myNames.length + listings.length
  const pointsHere = (name: IndexedNameSummary) => Boolean(selectedAddress) && trustedDuskAddressOf(name.records) === selectedAddress
  const primaryCount = myNames.filter((name) => primarySummaries[name.node]?.tone === 'success' && pointsHere(name) && indexedPrimaryIsActive(name, currentBlockHeight)).length

  return (
    <section className="my-names-panel" id="my-names" aria-labelledby="my-names-heading">
      <AccountViewHeader
        description={(
          <>
            {selectedAddress ? <>Held by <AddressChip value={selectedAddress} /></> : null}
            {nameCount ? <> · {nameCount} {pluralize(nameCount, 'name')}{primaryCount ? ` · ${primaryCount} primary` : ''}</> : null}
            {subnames.length ? <> · {subnames.length} {pluralize(subnames.length, 'subname')}</> : null}
          </>
        )}
        heading="My names"
        headingId="my-names-heading"
      />

      {myNames.length ? <p className="field-note my-names-note">Names don't renew automatically. After a name expires, it can still be renewed for 30 days; then anyone can register it.</p> : null}

      {myNamesError ? <PanelMessage icon={<AlertTriangle size={18} />}>{myNamesError}</PanelMessage> : null}
      {listingsUnavailable && !myNamesError ? <PanelMessage icon={<AlertTriangle size={18} />}>Names you listed in the market could not be loaded. Trying again.</PanelMessage> : null}

      {pendingReservations.length ? (
        <PendingReservationsList
          walletAction={!selectedAddress ? walletActionLabel(walletStatus ?? 'disconnected') : undefined}
          onConnectWallet={onConnectWallet}
          currentBlockHeight={currentBlockHeight}
          onForgetPendingReservation={onForgetPendingReservation}
          onOpenPendingReservation={onOpenPendingReservation}
          pendingReservations={pendingReservations}
          registrationsPaused={registrationsPaused}
        />
      ) : null}

      {myNames.length && (pendingReservations.length || listings.length || subnames.length) ? <h2 className="eyebrow my-names-section">Names</h2> : null}

      {myNames.length ? (
        <div className="name-card-grid">
          {myNames.map((name) => (
            <NameCard
              key={name.node}
              currentBlockHeight={currentBlockHeight}
              name={name}
              onOpen={onOpenIndexedName}
              primary={primarySummaries[name.node]}
              selectedAddress={selectedAddress}
            />
          ))}
        </div>
      ) : null}

      {listings.length ? <>
        <h2 className="eyebrow my-names-section">In the market</h2>
        <div className="name-card-grid">
          {listings.map(item => <ListingCard key={item.node} item={item} currentBlockHeight={currentBlockHeight} />)}
        </div>
      </> : null}

      {subnames.length ? <>
        <h2 className="eyebrow my-names-section">Subnames</h2>
        <div className="name-card-grid">
          {subnames.map(item => <SubnameCard key={item.node} item={item} currentBlockHeight={currentBlockHeight} onOpen={onOpenIndexedName} />)}
        </div>
      </> : null}

      {loading && empty ? (
        <div className="name-card-grid" aria-busy="true" aria-label="Loading names">
          {[0, 1, 2].map((index) => <div className="name-portrait skeleton" key={index} />)}
        </div>
      ) : empty && !myNamesError && !listingsUnavailable ? (
        <EmptyState className="my-names-empty" title={selectedAddress ? 'No names yet' : walletStatus === 'locked' ? 'Wallet locked' : 'Connect your wallet'}>
          <p>{selectedAddress ? 'This wallet has no names. Search for a name to register.' : walletStatus === 'locked' ? 'Unlock your wallet to see its names.' : 'Connect a wallet to see its names.'}</p>
          <div className="my-names-empty-actions">
            {selectedAddress ? null : (
              <Button variant="primary" className="compact" type="button" onClick={onConnectWallet}>
                {walletActionLabel(walletStatus ?? 'disconnected')}
              </Button>
            )}
            <Button variant={selectedAddress ? 'primary' : 'secondary'} type="button" onClick={onSearchHome}>
              Search names <ArrowRight size={17} />
            </Button>
          </div>
        </EmptyState>
      ) : null}
    </section>
  )
}
