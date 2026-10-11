import { describe, expect, it } from 'vitest'
import { lifecycleHeightReached, lifecycleHeightToUnixSeconds, lifecycleNote, overviewCopyForIssues, policyIssueCopy, renewalTermLimit } from './domainFormat'

it('treats prepaid lifecycle heights below a billion as blocks while retaining Unix seconds', () => {
  const nowSeconds = 1_790_000_000
  const currentBlockHeight = 1_000_000
  for (const height of [100_000_001, 100_259_200, 999_999_999]) {
    expect(lifecycleHeightReached(height, currentBlockHeight, nowSeconds)).toBe(false)
    expect(lifecycleHeightReached(height, height - 1, nowSeconds)).toBe(false)
    expect(lifecycleHeightReached(height, height, nowSeconds)).toBe(true)
    expect(lifecycleHeightToUnixSeconds(height, currentBlockHeight, nowSeconds)).toBe(nowSeconds + (height - currentBlockHeight) * 10)
    expect(lifecycleHeightToUnixSeconds(height, null, nowSeconds)).toBe(nowSeconds + height * 10)
  }
  for (const seconds of [1_000_000_001, 1_800_000_000]) {
    expect(lifecycleHeightReached(seconds, currentBlockHeight, seconds - 1)).toBe(false)
    expect(lifecycleHeightReached(seconds, currentBlockHeight, seconds)).toBe(true)
    expect(lifecycleHeightToUnixSeconds(seconds, currentBlockHeight, nowSeconds)).toBe(seconds)
    expect(lifecycleHeightToUnixSeconds(seconds, null, nowSeconds)).toBe(seconds)
  }
})

describe('domain policy copy', () => {
  it('explains that 1–2 character names cannot be registered', () => {
    const text = 'Labels shorter than 3 characters are reserved.'
    const expected = 'Dusk Domains start at 3 characters. 1–2 character names are reserved.'

    expect(policyIssueCopy(text)).toBe(expected)
    expect(overviewCopyForIssues('invalid', [{ tone: 'danger', text }])).toBe(expected)
  })
})

describe('renewal term limit', () => {
  const YEAR = 3_153_600
  it('allows terms up to exactly ten years past the current block', () => {
    expect(renewalTermLimit(1_000 + 3 * YEAR, 1_000)).toEqual({ maxYears: 7, nextYearAt: 1_000 + YEAR })
    // Renewing to exactly ten years ahead is allowed; one block more is not.
    expect(renewalTermLimit(1_000 + 2 * YEAR, 1_000).maxYears).toBe(8)
    expect(renewalTermLimit(1_000 + 2 * YEAR + 1, 1_000).maxYears).toBe(7)
    expect(renewalTermLimit(1_000 + 10 * YEAR, 1_000)).toEqual({ maxYears: 0, nextYearAt: 1_000 + YEAR })
    // During grace the old expiry is behind the current block: a full ten years is available.
    expect(renewalTermLimit(1_000, 2_000)).toEqual({ maxYears: 10, nextYearAt: null })
  })

  it('is unknown without a block-height expiry and the current height', () => {
    expect(renewalTermLimit(1_000, null).maxYears).toBeNull()
    expect(renewalTermLimit(1_800_000_000, 1_000).maxYears).toBeNull()
    expect(renewalTermLimit(0, 1_000).maxYears).toBeNull()
  })
})

describe('expiry notes', () => {
  it('explains the grace period for a root name that has not expired', () => {
    expect(lifecycleNote('aurora.dusk', 20_000, 1_000, 0)).toBe('Nothing renews automatically. After it expires, it can still be renewed for 30 days; then anyone can register it.')
    expect(lifecycleNote('aurora.dusk', 20_000, 20_000, 0)).toBeNull()
    expect(lifecycleNote('pay.aurora.dusk', 20_000, 1_000, 0)).toBeNull()
    expect(lifecycleNote('aurora.dusk', 0, 1_000, 0)).toBeNull()
  })
})
