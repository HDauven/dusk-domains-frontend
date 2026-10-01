import { useEffect, useState } from 'react'
import { auctionCountdown } from './auctionCountdown'

export function AuctionCountdown({ endBlock, currentBlock }: { endBlock: number; currentBlock: number | null }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const started = Date.now()
    const tick = () => setElapsed((Date.now() - started) / 1000)
    const timer = window.setInterval(tick, 1000)
    queueMicrotask(tick)
    return () => window.clearInterval(timer)
  }, [currentBlock, endBlock])
  return <span role="timer" aria-label="Estimated time remaining">{auctionCountdown(endBlock, currentBlock, elapsed)}</span>
}
