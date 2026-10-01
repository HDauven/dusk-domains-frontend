import { describe, expect, it } from 'vitest'
import { lifecycleHeightReached, lifecycleHeightToUnixSeconds, overviewCopyForIssues, policyIssueCopy } from './domainFormat'

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
