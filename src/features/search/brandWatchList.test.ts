import { RESERVED_LABELS, validateName } from '@duskdomains/sdk'
import { expect, it } from 'vitest'
import { brandWatchList } from './brandWatchList'
import { watchedBrand } from './watchedBrand'

it('keeps 250–400 unique valid brand labels outside the reserved ecosystem list', () => {
  expect(brandWatchList.length).toBeGreaterThanOrEqual(250)
  expect(brandWatchList.length).toBeLessThanOrEqual(400)
  expect(new Set(brandWatchList).size).toBe(brandWatchList.length)
  for (const label of brandWatchList) {
    expect(label).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(validateName(`${label}.dusk`).ok).toBe(true)
    expect(validateName(`${label}.dusk`)).toMatchObject({ rootEligibility: 'Public' })
    expect(RESERVED_LABELS).not.toContain(label)
  }
  for (const label of ['jpmorgan', 'hsbc', 'blackrock', 'vanguard', 'nasdaq', 'coinbase', 'visa', 'tether', 'revolut', 'google', 'ubs', 'euroclear', 'dtcc']) {
    expect(brandWatchList).toContain(label)
  }
  // Everyday words and short acronyms would flag ordinary names as unverified brands.
  for (const label of ['sky', 'circle', 'treasury', 'booking', 'ledger', 'oracle', 'square', 'sec', 'fed', 'ice']) {
    expect(brandWatchList).not.toContain(label)
  }
})

it.each(['google', 'google.dusk', 'GOOGLE.DUSK'])('matches an exact root label: %s', name => {
  expect(watchedBrand(name)).toBe('google')
})

it.each(['mail.google.dusk', 'google.alice.dusk', 'google.com', 'mygoogle.dusk', 'google-pay.dusk', 'g00gle.dusk', 'google.dusk.evil', 'alice.dusk', 'dusk.dusk', ''])('does not match subnames, lookalikes or other labels: %s', name => {
  expect(watchedBrand(name)).toBeNull()
})
