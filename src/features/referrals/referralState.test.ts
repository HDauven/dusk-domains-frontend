import { afterEach, describe, expect, it, vi } from 'vitest'
import { encodeBase58 } from '../../names/internal'
import { initialReferralInput, referralStateFromInput } from './referralState'

const account = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'

afterEach(() => vi.unstubAllGlobals())

describe('referral links', () => {
  it.each([account, `contract:0x${'09'.repeat(32)}`])('accepts claimable runtime principals: %s', async (input) => {
    vi.stubGlobal('location', { search: `?ref=${encodeURIComponent(input)}` })
    expect(await referralStateFromInput(initialReferralInput())).toMatchObject({ input, valid: true, reason: '' })
  })

  it.each([
    `0x${'09'.repeat(32)}`,
    encodeBase58(Array(193).fill(7)),
    encodeBase58(Array(96).fill(7)),
    encodeBase58([0xc0, ...Array(95).fill(0)]),
    encodeBase58([0x80, ...Array(95).fill(0)]),
    encodeBase58([0x80, ...Array(94).fill(0), 2]),
    `contract:0x${'00'.repeat(32)}`,
  ])('ignores unclaimable links and stored attribution: %s', async (input) => {
    vi.stubGlobal('location', { search: `?ref=${encodeURIComponent(input)}` })
    expect(await referralStateFromInput(initialReferralInput())).toMatchObject({ principal: null, valid: false, reason: 'Referral ignored: this address cannot claim rewards.' })
    vi.stubGlobal('location', { search: '' })
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ version: 1, input, expiresAt: Date.now() + 10000 }) })
    expect(await referralStateFromInput(initialReferralInput())).toMatchObject({ principal: null, valid: false })
  })

  it('normalizes URL input before tracking asynchronous validation', () => {
    vi.stubGlobal('location', { search: `?ref=${encodeURIComponent(`  ${account}  `)}` })
    expect(initialReferralInput()).toBe(account)
  })

  it('treats empty attribution as no referral', async () => {
    expect(await referralStateFromInput(' ')).toEqual({ input: '', principal: null, valid: false, reason: '' })
  })
})
