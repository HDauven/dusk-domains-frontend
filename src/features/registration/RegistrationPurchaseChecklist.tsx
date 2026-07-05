import { CheckCircle2, Clock } from 'lucide-react'
import type { CommitWindow } from './flow/types'
import { pendingReservationNextStepCopy } from './registrationCopy'

export function RegistrationPurchaseChecklist({
  commitWindow,
  registrationComplete = false,
}: {
  commitWindow: CommitWindow
  registrationComplete?: boolean
}) {
  return (
    <div className="includes review-includes">
      <h3>{registrationComplete ? 'Complete' : 'Purchase'}</h3>
      <span><CheckCircle2 size={16} /> Reservation signed</span>
      <span>
        {registrationComplete ? <CheckCircle2 size={16} /> : <Clock size={16} />}
        {registrationComplete ? 'Domain active' : commitWindow.status === 'ready' ? 'Ready to complete' : pendingReservationNextStepCopy(commitWindow.status, commitWindow.waitBlocks)}
      </span>
      <span><CheckCircle2 size={16} /> Fee paid on completion</span>
    </div>
  )
}
