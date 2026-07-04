import { Minus, Plus } from 'lucide-react'

export function RegistrationDurationStep({
  canRegister,
  duration,
  expiryDate,
  feeConfigError,
  feeConfigLoading,
  maxDurationYears,
  minDurationYears,
  onDurationChange,
  registrationFee,
}: {
  canRegister: boolean
  duration: number
  expiryDate: string
  feeConfigError: string
  feeConfigLoading: boolean
  maxDurationYears: number
  minDurationYears: number
  onDurationChange: (duration: number) => void
  registrationFee: number
}) {
  return (
    <div className="duration-section">
      <h3>Registration duration</h3>
      <div className="duration-control">
        <div className="duration-control-header">
          <div>
            <span>Registration period</span>
            <strong>{duration} {duration === 1 ? 'year' : 'years'}</strong>
          </div>
          <output>{canRegister ? `${registrationFee.toFixed(2)} DUSK` : '-'}</output>
        </div>
        <div className="duration-slider-row">
          <button
            aria-label="Decrease registration duration"
            className="duration-stepper"
            disabled={!canRegister || duration <= minDurationYears}
            type="button"
            onClick={() => onDurationChange(duration - 1)}
          >
            <Minus size={16} />
          </button>
          <input
            aria-label="Registration duration in years"
            className="duration-slider"
            disabled={!canRegister}
            max={maxDurationYears}
            min={minDurationYears}
            step={1}
            type="range"
            value={duration}
            onChange={(event) => onDurationChange(Number(event.target.value))}
          />
          <button
            aria-label="Increase registration duration"
            className="duration-stepper"
            disabled={!canRegister || duration >= maxDurationYears}
            type="button"
            onClick={() => onDurationChange(duration + 1)}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="duration-scale">
          <span>{minDurationYears} year</span>
          <span>{maxDurationYears} years</span>
        </div>
        <div className="duration-calendar">
          <span>Estimated expiry</span>
          <strong>{canRegister ? expiryDate : '-'}</strong>
        </div>
        {feeConfigLoading || feeConfigError ? (
          <p className={feeConfigError ? 'field-note warning' : 'field-note'}>
            {feeConfigError || 'Loading live pricing.'}
          </p>
        ) : null}
      </div>
    </div>
  )
}
