import { expect, it } from 'vitest'
import { auctionCountdown } from './auctionCountdown'

it('ticks between blocks without claiming the chain has ended the auction', () => {
  expect(auctionCountdown(106, 100)).toBe('00:01:00')
  expect(auctionCountdown(106, 100, 1)).toBe('00:00:59')
  expect(auctionCountdown(106, 100, 60)).toBe('Waiting for the next block')
  expect(auctionCountdown(106, 106)).toBe('Ready to finalize')
  expect(auctionCountdown(106, null)).toBe('Waiting for chain time')
  expect(auctionCountdown(166, 106)).toBe('00:10:00')
})
