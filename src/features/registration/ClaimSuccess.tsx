import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { NameCard } from '../../components/ui/NameCard'
import { NameSignature } from '../../components/ui/NameChip'
import { downloadNameCard } from './shareNameCard'
import type { RegistrationCompletionState } from './registrationCompletionState'

export function ClaimSuccess({ name, onOpen, onAddRecords, progress }: {
  name: string
  onOpen: () => void
  onAddRecords?: () => void
  progress: RegistrationCompletionState | null
}) {
  const [error, setError] = useState('')
  return <section className="claim-success" aria-labelledby="claim-success-heading">
    <h1 id="claim-success-heading" aria-label={`${name} is yours`}><NameSignature name={name} fit /> is yours</h1>
    <NameCard name={name} />
    <div className="claim-success-actions">
      <Button variant="primary" onClick={onOpen}>Open</Button>
      <Button onClick={onAddRecords ?? onOpen}>Add records</Button>
      <Button variant="quiet" onClick={() => { setError(''); void downloadNameCard(name).catch(error => setError(error.message)) }}>Download card</Button>
    </div>
    {error ? <p role="alert">{error}</p> : null}
    <details><summary>Details</summary>{progress?.steps.filter(step => step.txId).map(step => <p key={step.id}>Transaction <code>{step.txId}</code></p>)}</details>
  </section>
}
