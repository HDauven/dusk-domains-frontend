import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import {
  coreCommitRuntimeCall,
  coreAcceptMarketplaceOfferRuntimeCall,
  coreEscrowAuctionRuntimeCall,
  coreEscrowFixedSaleRuntimeCall,
  coreRemoveSubnameRuntimeCall,
  coreTakeBackSubnamesRuntimeCall,
  DUSK_DOMAINS_CONTRACTS,
  encodeBase58,
  treasuryAcceptOperatorRuntimeCall,
  treasuryClaimAllReferralRewardsRuntimeCall,
  treasuryClaimReferralRewardRuntimeCall,
  treasuryProposeOperatorRuntimeCall,
} from '../names/internal'
import { unpaused } from './operatorPause'
import { useDuskDomainWriter } from './useDuskDomainWriter'
import { createWriteAccess } from './writeAccess'

const account = encodeBase58(Array(96).fill(7))
const otherAccount = encodeBase58(Array(96).fill(8))
const node = `0x${'11'.repeat(32)}`
const contracts = {
  ...DUSK_DOMAINS_CONTRACTS,
  core: { ...DUSK_DOMAINS_CONTRACTS.core, contractId: node },
  treasury: { ...DUSK_DOMAINS_CONTRACTS.treasury, contractId: `0x${'22'.repeat(32)}` },
}

it.each([
  [coreCommitRuntimeCall({ commitment: node }), 10_000_000n],
  [coreTakeBackSubnamesRuntimeCall({ node, nodes: [node], owner: node, manager: node }), 20_000_000n],
  [coreRemoveSubnameRuntimeCall({ node }), 20_000_000n],
  [treasuryClaimReferralRewardRuntimeCall({ amountLux: 100, recipient: otherAccount }), 70_000_000n],
  [treasuryClaimAllReferralRewardsRuntimeCall({ recipient: otherAccount }), 70_000_000n],
  [treasuryClaimReferralRewardRuntimeCall({ amountLux: 100, recipient: account }), 10_000_000n],
  [treasuryClaimAllReferralRewardsRuntimeCall({ recipient: account }), 10_000_000n],
  [treasuryAcceptOperatorRuntimeCall(), 70_000_000n],
  ...([account, otherAccount] as const).flatMap(recipient => {
    const limit = recipient === account ? 10_000_000n : 70_000_000n
    return [
      [coreEscrowFixedSaleRuntimeCall({ node, marketplaceContract: node, name: 'alpha.dusk', priceLux: 100, expiresAt: 100, sellerRecipient: recipient }), limit],
      [coreEscrowAuctionRuntimeCall({ node, marketplaceContract: node, name: 'alpha.dusk', reservePriceLux: 100, durationBlocks: 100, sellerRecipient: recipient }), limit],
      [coreAcceptMarketplaceOfferRuntimeCall({ node, marketplaceContract: node, buyerAuthority: node, expectedOfferId: 1, expectedFeeBps: 250, expectedAmountLux: 100, sellerRecipient: recipient }), limit],
      [treasuryProposeOperatorRuntimeCall({ operator: { kind: 'Moonlight', bytes: Array(96).fill(8) }, operatorRecipient: recipient }), limit],
    ] as const
  }),
] as const)('passes the gas limit through the shared writer: %s', async (call, limit) => {
  const profile = { account, profileId: 'primary' }
  const wallet = { state: { installed: true, authorized: true, chainId: 'dusk:0', profiles: [profile], selectedProfile: profile } as import('@dusk/connect').DuskWalletState }
  const app = {
    chainId: 'dusk:0',
    readContract: vi.fn(async () => null),
    prepareContractCall: vi.fn(async () => ({})),
    writeContract: vi.fn(async () => ({ status: 'executed' })),
  }
  let submit!: ReturnType<typeof useDuskDomainWriter>
  function Probe() {
    submit = useDuskDomainWriter({ wallet, chainId: 'dusk:0', contracts, liveDuskDomainsApp: app,
      writeAccess: createWriteAccess({ mode: 'live_ready', liveWritesEnabled: true }, app, unpaused) })
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  expect(await submit('alpha.dusk', call)).toMatchObject({ status: 'executed' })
  expect(app.writeContract).toHaveBeenCalledWith(expect.objectContaining({ functionName: call.functionName, gas: { limit } }))
})
