import { ReservationRecoveryNotice } from './ReservationRecoveryNotice'

type RegistrationFlowStatusProps = {
  onViewPendingReservation: () => void
  showReservationRecovery: boolean
  walletError: string
}

export function RegistrationFlowStatus({
  onViewPendingReservation,
  showReservationRecovery,
  walletError,
}: RegistrationFlowStatusProps) {
  return (
    <>
      {showReservationRecovery ? (
        <ReservationRecoveryNotice onView={onViewPendingReservation} />
      ) : null}

      {walletError ? <p className="secure-note danger">{walletError}</p> : null}
    </>
  )
}
