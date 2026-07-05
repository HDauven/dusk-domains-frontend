import type { DuskDomainTxState } from '../../names/internal'

export type RegistrationCompletionStepId = 'complete_registration'

export type RegistrationCompletionStepStatus = 'pending' | 'active' | 'executed' | 'failed'

export type RegistrationCompletionStep = {
  id: RegistrationCompletionStepId
  title: string
  description: string
  status: RegistrationCompletionStepStatus
  txId?: string
  message?: string
}

export type RegistrationCompletionState = {
  status: 'running' | 'executed' | 'failed'
  activeStep: RegistrationCompletionStepId
  steps: RegistrationCompletionStep[]
  message?: string
}

const registrationCompletionStepDefinitions: Array<Omit<RegistrationCompletionStep, 'status' | 'txId' | 'message'>> = [
  {
    id: 'complete_registration',
    title: 'Register name',
    description: 'Complete the reservation and activate the name',
  },
]

export function createRegistrationCompletionState(): RegistrationCompletionState {
  return {
    status: 'running',
    activeStep: 'complete_registration',
    steps: registrationCompletionStepDefinitions.map((step) => ({
      ...step,
      status: step.id === 'complete_registration' ? 'active' : 'pending',
    })),
  }
}

export function updateRegistrationCompletionState(
  current: RegistrationCompletionState | null,
  stepId: RegistrationCompletionStepId,
  txState: DuskDomainTxState,
): RegistrationCompletionState {
  const base = current ?? createRegistrationCompletionState()
  const stepIndex = registrationCompletionStepDefinitions.findIndex((step) => step.id === stepId)
  const txFailed = isFailedTxStatus(txState.status)
  const stepStatus: RegistrationCompletionStepStatus = txFailed
    ? 'failed'
    : txState.status === 'executed'
      ? 'executed'
      : 'active'

  const steps = base.steps.map((step, index) => {
    if (step.id === stepId) {
      return {
        ...step,
        status: stepStatus,
        txId: txState.txId ?? step.txId,
        message: txFailed ? txState.message : undefined,
      }
    }

    if (index < stepIndex && step.status !== 'failed') {
      return {
        ...step,
        status: 'executed' as const,
      }
    }

    if (index === stepIndex + 1 && txState.status === 'executed' && step.status === 'pending') {
      return {
        ...step,
        status: 'active' as const,
      }
    }

    return step
  })
  const failed = steps.some((step) => step.status === 'failed')
  const executed = steps.every((step) => step.status === 'executed')
  return {
    status: failed ? 'failed' : executed ? 'executed' : 'running',
    activeStep: failed || txState.status !== 'executed'
      ? stepId
      : steps.find((step) => step.status === 'active')?.id ?? stepId,
    steps,
    message: failed ? txState.message : undefined,
  }
}

export function markRegistrationCompletionExecuted(current: RegistrationCompletionState | null): RegistrationCompletionState {
  const base = current ?? createRegistrationCompletionState()
  return {
    status: 'executed',
    activeStep: 'complete_registration',
    steps: base.steps.map((step) => ({
      ...step,
      status: 'executed',
    })),
  }
}

export function markRegistrationCompletionFailed(
  current: RegistrationCompletionState | null,
  message: string,
): RegistrationCompletionState {
  const base = current ?? createRegistrationCompletionState()
  return {
    ...base,
    status: 'failed',
    message,
    steps: base.steps.map((step) => (
      step.id === base.activeStep
        ? {
            ...step,
            status: 'failed',
            message,
          }
        : step
    )),
  }
}

function isFailedTxStatus(status: DuskDomainTxState['status']) {
  return status === 'failed' || status === 'rejected' || status === 'timeout'
}

