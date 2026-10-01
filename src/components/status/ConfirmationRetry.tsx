import { Button } from '../ui/Button'
import type { ConfirmationState } from '../../app/confirmationRead'

export function ConfirmationRetry({ state }: { state?: ConfirmationState | null }) {
  return state?.retryConfirmation ? <div className="confirmation-retry">
    <p>Automatic checks paused after 5 minutes. Check again without sending another transaction.</p>
    <Button onClick={state.retryConfirmation}>Retry confirmation</Button>
  </div> : null
}
