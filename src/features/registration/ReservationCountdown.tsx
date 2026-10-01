import { countdownCopy } from './registrationCopy'
import { useEffect, useState } from 'react'
import { DUSK_APPROX_BLOCK_TIME_SECONDS } from '../../names/internal'

// Remount when the observed block count changes. The estimate never enables Register.
export function ReservationCountdown({ blocks }: { blocks: number }) {
  const [started] = useState(Date.now)
  const [now, setNow] = useState(started)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return <strong>{countdownCopy(blocks * DUSK_APPROX_BLOCK_TIME_SECONDS - (now - started) / 1000)}</strong>
}
