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
    preparedCommit: { commitment: `0x${'01'.repeat(32)}`, secret: `0x${'02'.repeat(32)}`, committedBlockHeight: 90, committedTxId: 'commit-tx' },
    registerSetsPrimary: true,
    registrationTargetAddress: account,
    result: analyzeName('aurora.dusk'),
  })
  expect(request).not.toBeInstanceOf(Promise)
  expect(request.call).toMatchObject({
    contract: 'core', functionName: 'complete_registration_runtime', kind: 'write',
    args: { referrer: principal, feeLux: request.feeLux, records: [request.initialMoonlightRecord] },
  })
})
