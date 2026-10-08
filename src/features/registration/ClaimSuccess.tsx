import { Button } from '../../components/ui/Button'
import { NameSignature } from '../../components/ui/NameChip'
import type { RegistrationCompletionState } from './registrationCompletionState'

// The name page's Night Card, with its Share and Download card row, sits right above.
export function ClaimSuccess({ name, onOpen, onAddRecords, progress }: {
  name: string
  onOpen: () => void
  onAddRecords?: () => void
  progress: RegistrationCompletionState | null
}) {
  return <section className="claim-success" aria-labelledby="claim-success-heading">
    <h1 id="claim-success-heading" aria-label={`${name} is yours`}><NameSignature name={name} fit /> is yours</h1>
    <div className="claim-success-actions">
      <Button variant="primary" onClick={onOpen}>Open</Button>
      <Button onClick={onAddRecords ?? onOpen}>Add records</Button>
    </div>
    <details><summary>Details</summary>{progress?.steps.filter(step => step.txId).map(step => <p key={step.id}>Transaction <code>{step.txId}</code></p>)}</details>
  </section>
}
