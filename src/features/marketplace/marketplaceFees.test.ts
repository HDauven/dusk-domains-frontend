import { expect, it } from 'vitest'
import { marketplaceProceeds, proceedsRows } from './marketplaceFees'

it('shows the escrow split with the contract’s integer fee rounding', () => {
  expect(marketplaceProceeds(25_000_000_000n, 250)).toEqual({ feeLux: 625_000_000n, proceedsLux: 24_375_000_000n })
  expect(marketplaceProceeds(1_000_000_001n, 250)).toEqual({ feeLux: 25_000_000n, proceedsLux: 975_000_001n })
  expect(proceedsRows(25_000_000_000n, 250)).toEqual([
    { label: 'Marketplace fee (2.50%) to treasury', value: '0.625 DUSK', exactValue: '0.625 DUSK' },
    { label: 'Seller receives', value: '24.375 DUSK', exactValue: '24.375 DUSK' },
  ])
})
