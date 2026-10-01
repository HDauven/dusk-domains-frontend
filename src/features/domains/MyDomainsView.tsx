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
import { PendingReservationsList } from './my-domains/PendingReservationsList'

export type MyNamePrimarySummary = {
  label: string
  tone: 'success' | 'warning' | 'muted'
}

export type MyDomainsViewProps = {
  walletStatus?: WalletConnectionStatus
  currentBlockHeight: number | null
  loading: boolean
  myNames: IndexedNameSummary[]
  myNamesError: string
  onConnectWallet: () => void
  onForgetPendingReservation: (reservation: PendingNameReservation) => void
  onOpenIndexedName: (name: string) => void
  onOpenPendingReservation: (reservation: PendingNameReservation) => void
  onSearchHome: () => void
  pendingReservations: PendingNameReservation[]
  primarySummaries: Record<string, MyNamePrimarySummary>
  selectedAddress: string
}

// Everything the connected wallet holds: claims still in progress first, then its names.
export function MyDomainsView({
  walletStatus,
  currentBlockHeight,
  loading,
  myNames,
  myNamesError,
  onConnectWallet,
  onForgetPendingReservation,
  onOpenIndexedName,
  onOpenPendingReservation,
  onSearchHome,
  pendingReservations,
  primarySummaries,
  selectedAddress,
}: MyDomainsViewProps) {
  const empty = myNames.length === 0 && pendingReservations.length === 0
  const pointsHere = (name: IndexedNameSummary) => name.records.find((record) => record.key === 'moonlight_address')?.value === selectedAddress
  const primaryCount = myNames.filter((name) => primarySummaries[name.node]?.tone === 'success' && pointsHere(name)).length

  return (
    <section className="my-names-panel" id="my-names" aria-labelledby="my-names-heading">
      <AccountViewHeader
        description={(
          <>
            {selectedAddress ? <>Held by <AddressChip value={selectedAddress} /></> : null}
            {myNames.length ? <> · {myNames.length} {pluralize(myNames.length, 'name')}{primaryCount ? ` · ${primaryCount} primary` : ''}</> : null}
          </>
        )}
        heading="My names"
        headingId="my-names-heading"
      />

      {myNamesError ? <PanelMessage icon={<AlertTriangle size={18} />}>{myNamesError}</PanelMessage> : null}

      {pendingReservations.length ? (
        <PendingReservationsList
          walletAction={!selectedAddress ? walletActionLabel(walletStatus ?? 'disconnected') : undefined}
          onConnectWallet={onConnectWallet}
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
              selectedAddress={selectedAddress}
            />
          ))}
        </div>
      ) : null}

      {loading && empty ? (
        <div className="name-card-grid" aria-busy="true" aria-label="Loading names">
          {[0, 1, 2].map((index) => <div className="name-portrait skeleton" key={index} />)}
        </div>
      ) : empty && !myNamesError ? (
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
