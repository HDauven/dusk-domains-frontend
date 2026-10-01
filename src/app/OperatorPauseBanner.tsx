import type { OperatorPause } from './operatorPause'

export function OperatorPauseBanner({ pause }: { pause: OperatorPause }) {
  if (!pause.registrationsPaused && !pause.tradingPaused) return null
  return <div className="operator-pause-banner" role="status">
    {pause.registrationsPaused && <p>Registrations paused. New reservations and registrations will resume when the operator reopens them.</p>}
    {pause.tradingPaused && <p>Marketplace trading paused. You can still cancel orders, finalize ended auctions and withdraw refunds.</p>}
  </div>
}
