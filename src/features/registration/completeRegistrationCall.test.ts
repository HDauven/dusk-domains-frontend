import { expect, it } from 'vitest'
import { analyzeName, DEFAULT_FEE_CONFIG, type DuskPrincipal } from '../../names/internal'
import { createCompleteRegistrationRequest } from './completeRegistrationCall'

const account = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'

it.each<DuskPrincipal | null>([null, { kind: 'Contract', bytes: Array(32).fill(9) }])('builds a registration request synchronously with referral %j', (principal) => {
  const request = createCompleteRegistrationRequest({
    appliedReferral: principal ? { input: `contract:0x${'09'.repeat(32)}`, principal, valid: true, reason: '' } : null,
    displayName: 'aurora.dusk',
    duration: 1,
    feeConfig: DEFAULT_FEE_CONFIG,
    lifecycleBaseBlockHeight: 100,
    selectedAddress: account, selectedAuthority: 'controller', runtimeConfig: { chainId: 'dusk:0' } as never,
    preparedCommit: { controller: 'controller', ownerAddress: account, chainId: 'dusk:0', commitment: `0x${'01'.repeat(32)}`, secret: `0x${'02'.repeat(32)}`, committedBlockHeight: 90, committedTxId: 'commit-tx' },
    registerSetsPrimary: true,
    registrationTargetAddress: account,
    result: analyzeName('aurora.dusk'),
  })
  expect(request).not.toBeInstanceOf(Promise)
  expect(request.call).toMatchObject({
    contract: 'store', functionName: 'complete_registration', kind: 'write',
    args: { referrer: principal, feeLux: request.feeLux, records: [request.initialMoonlightRecord] },
  })
})

it('deposits the quoted premium plus the full base term', () => {
  const request = createCompleteRegistrationRequest({
    appliedReferral: null, displayName: 'aurora.dusk', duration: 3, feeConfig: DEFAULT_FEE_CONFIG,
    lifecycleBaseBlockHeight: 100,
    selectedAddress: account, selectedAuthority: 'controller', runtimeConfig: { chainId: 'dusk:0' } as never,
    preparedCommit: { controller: 'controller', ownerAddress: account, chainId: 'dusk:0', commitment: `0x${'01'.repeat(32)}`, secret: `0x${'02'.repeat(32)}`, committedBlockHeight: 90, committedTxId: 'commit-tx' },
    registerSetsPrimary: false, registrationTargetAddress: account,
    result: { ...analyzeName('aurora'), premiumLux: 999_999_523_162_842 },
  })
  expect(request.feeLux).toBe(30_000_000_000 + 999_999_523_162_842)
  expect(request.call.args.feeLux).toBe(request.feeLux)
})

it.each(['controller', 'ownerAddress', 'chainId'])('refuses to construct a reveal with mismatched %s', field => {
  expect(() => createCompleteRegistrationRequest({
    appliedReferral: null, displayName: 'aurora.dusk', duration: 1, feeConfig: DEFAULT_FEE_CONFIG,
    lifecycleBaseBlockHeight: 100, registerSetsPrimary: false, registrationTargetAddress: account,
    selectedAddress: account, selectedAuthority: 'controller', runtimeConfig: { chainId: 'dusk:0' } as never,
    result: analyzeName('aurora.dusk'),
    preparedCommit: { controller: 'controller', ownerAddress: account, chainId: 'dusk:0', [field]: 'different',
      commitment: `0x${'01'.repeat(32)}`, secret: `0x${'02'.repeat(32)}`, committedBlockHeight: 90, committedTxId: 'tx' },
  })).toThrow('wallet session changed')
})
