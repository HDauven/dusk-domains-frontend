import { describe, expect, it } from 'vitest'
import { browserWriteProofUrlFromEnv } from './appEnv'

describe('app env helpers', () => {
  it('prefers the Dusk Domains browser proof URL', () => {
    expect(browserWriteProofUrlFromEnv({
      VITE_DUSK_DOMAINS_BROWSER_WRITE_PROOF_URL: 'https://domains.example/proof',
      VITE_DUSK_NAMES_BROWSER_WRITE_PROOF_URL: 'https://legacy.example/proof',
    })).toBe('https://domains.example/proof')
  })

  it('keeps the legacy browser proof URL as a compatibility alias', () => {
    expect(browserWriteProofUrlFromEnv({
      VITE_DUSK_NAMES_BROWSER_WRITE_PROOF_URL: 'https://legacy.example/proof',
    })).toBe('https://legacy.example/proof')
  })

  it('ignores non-string browser proof env values', () => {
    expect(browserWriteProofUrlFromEnv({
      VITE_DUSK_DOMAINS_BROWSER_WRITE_PROOF_URL: true,
      VITE_DUSK_NAMES_BROWSER_WRITE_PROOF_URL: false,
    })).toBeUndefined()
  })
})
