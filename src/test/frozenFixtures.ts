import { registrationCommitmentHex } from '@duskdomains/sdk'
import { namehashHex } from '../names/hash'
import { createDuskDomainsRuntimeConfig, roles } from '../names/config'
import type { PendingNameReservation } from '../names/reservations'
export const account =
  '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'
export const config = createDuskDomainsRuntimeConfig({
  VITE_DUSK_DOMAINS_CHAIN_ID: 'dusk:0',
  VITE_DUSK_DOMAINS_NODE_URL: 'http://127.0.0.1:18181',
  VITE_DUSK_DOMAINS_INDEXER_URL: '/api',
  VITE_DUSK_DOMAINS_ENABLE_LIVE_WRITES: 'true',
  ...Object.fromEntries(
    roles.flatMap((role, i) => [
      [
        `VITE_DUSK_DOMAINS_${role.toUpperCase()}_CONTRACT_ID`,
        (i + 1).toString(16).padStart(2, '0').repeat(32),
      ],
      [
        `VITE_DUSK_DOMAINS_${role.toUpperCase()}_DRIVER_URL`,
        `/contracts/dusk-domains-${role}.${'ab'.repeat(32)}.data-driver.wasm`,
      ],
    ]),
  ),
})
export const contracts = config.contracts
export function reservation(overrides: Partial<PendingNameReservation> = {}): PendingNameReservation {
  const r = {
    name: 'resume.dusk',
    controller: '0x' + '11'.repeat(32),
    ownerAddress: account,
    chainId: 'dusk:0',
    directory: contracts.directory.contractId,
    commitmentStore: contracts.store.contractId,
    durationYears: 1,
    secret: '0x' + '33'.repeat(32),
    committedBlockHeight: 100,
    committedTxId: 'commit-tx',
    createdAt: '2030-01-01T00:00:00.000Z',
    updatedAt: '2030-01-01T00:00:00.000Z',
    ...overrides,
  }
  const node = namehashHex(r.name)
  return {
    ...r,
    node,
    commitment: registrationCommitmentHex({
      node,
      controller: r.controller,
      label: r.name.replace(/\.dusk$/, ''),
      secret: r.secret,
    }),
  }
}
