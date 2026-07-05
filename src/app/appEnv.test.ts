import { describe, expect, it } from 'vitest'
import { browserWriteProofUrlFromEnv } from './appEnv'

describe('app env helpers', () => {
  it('uses the Dusk Domains browser proof URL', () => {
    expect(browserWriteProofUrlFromEnv({
      VITE_DUSK_DOMAINS_BROWSER_WRITE_PROOF_URL: 'https://domains.example/proof',
    })).toBe('https://domains.example/proof')
  })

  it('ignores non-string browser proof env values', () => {
    expect(browserWriteProofUrlFromEnv({
      VITE_DUSK_DOMAINS_BROWSER_WRITE_PROOF_URL: false,
    })).toBeUndefined()
  })
})
