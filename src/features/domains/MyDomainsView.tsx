import { AlertTriangle, Clock } from 'lucide-react'
import { PanelMessage } from '../../components/ui/PanelMessage'
import { MyDomainRows } from './my-domains/MyDomainRows'
import { MyDomainsEmptyState } from './my-domains/MyDomainsEmptyState'
import { MyDomainsHeader } from './my-domains/MyDomainsHeader'
import { PendingReservationsList } from './my-domains/PendingReservationsList'
import type { MyDomainsViewProps } from './my-domains/types'

export function MyDomainsView({
  currentBlockHeight,
  description,
  emptyCopy,
  emptyTitle,
  formatNameLifecycle,
  formatPendingReservationDetail,
  heading,
  loading,
  myNames,
  myNamesError,
  onForgetPendingReservation,
  onOpenIndexedName,
  onOpenPendingReservation,
  onRefresh,
  onSearchHome,
  pendingReservationActionCopy,
  pendingReservationNextStepCopy,
  pendingReservationStatusCopy,
  pendingReservations,
  primarySummaries,
  verifiedPrimaryCount,
}: MyDomainsViewProps) {
  const pendingReservationCount = pendingReservations.length
  const showEmpty = myNames.length === 0 && pendingReservationCount === 0 && !myNamesError
  const showLoading = loading && myNames.length === 0 && pendingReservationCount === 0

  return (
    <section className="my-names-panel" id="my-names" aria-labelledby="my-names-heading">
      <MyDomainsHeader
        description={description}
        heading={heading}
        loading={loading}
        myNames={myNames}
        onRefresh={onRefresh}
        pendingReservations={pendingReservations}
        verifiedPrimaryCount={verifiedPrimaryCount}
      />

      {myNamesError ? (
        <PanelMessage icon={<AlertTriangle size={18} />}>{myNamesError}</PanelMessage>
      ) : null}

      {showLoading ? (
        <PanelMessage icon={<Clock size={18} />}>Loading names</PanelMessage>
      ) : showEmpty ? (
        <MyDomainsEmptyState
          emptyCopy={emptyCopy}
          emptyTitle={emptyTitle}
          onSearchHome={onSearchHome}
        />
      ) : (
        <>
          {pendingReservationCount > 0 ? (
            <PendingReservationsList
              currentBlockHeight={currentBlockHeight}
              formatPendingReservationDetail={formatPendingReservationDetail}
              onForgetPendingReservation={onForgetPendingReservation}
              onOpenPendingReservation={onOpenPendingReservation}
              pendingReservationActionCopy={pendingReservationActionCopy}
              pendingReservationNextStepCopy={pendingReservationNextStepCopy}
              pendingReservationStatusCopy={pendingReservationStatusCopy}
              pendingReservations={pendingReservations}
            />
          ) : null}

          {myNames.length > 0 ? (
            <MyDomainRows
              formatNameLifecycle={formatNameLifecycle}
              myNames={myNames}
              onOpenIndexedName={onOpenIndexedName}
              primarySummaries={primarySummaries}
            />
          ) : null}
        </>
      )}
    </section>
  )
}

export type { MyDomainsViewProps, MyNamePrimarySummary } from './my-domains/types'
