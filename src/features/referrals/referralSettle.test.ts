import { afterEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({ fail: false }))
vi.mock('../../names/internal', async (load) => {
  const actual = await load<typeof import('../../names/internal')>()
  return {
    ...actual,
    isClaimableReferrer: async (...args: Parameters<typeof actual.isClaimableReferrer>) => {
      if (sdk.fail) throw new Error('BLS module failed to load')
      return actual.isClaimableReferrer(...args)
    },
  }
})

const { settleReferralInput } = await import('./referralState')

const contractRef = `contract:0x${'09'.repeat(32)}`
const moonlightRef = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'

function memoryStorage() {
  const items = new Map<string, string>()
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value) },
    removeItem: (key: string) => { items.delete(key) },
    stored: () => [...items.values()].join(''),
  }
}

afterEach(() => {
  sdk.fail = false
  vi.unstubAllGlobals()
})

describe('settling referral input', () => {
  it('clears a previously stored referral when the new one cannot be checked', async () => {
    const storage = memoryStorage()
    vi.stubGlobal('sessionStorage', storage)
    expect(await settleReferralInput(contractRef, () => true)).toMatchObject({ valid: true })
    expect(storage.stored()).toContain(contractRef)

    sdk.fail = true
    expect(await settleReferralInput(moonlightRef, () => true))
      .toMatchObject({ valid: false, reason: 'Referral could not be checked. Try again.' })
    expect(storage.stored()).not.toContain(contractRef)
  })

  it('leaves storage alone when a newer input replaced this one', async () => {
    const storage = memoryStorage()
    vi.stubGlobal('sessionStorage', storage)
    expect(await settleReferralInput(contractRef, () => false)).toBeNull()
    expect(storage.stored()).toBe('')
  })
})
