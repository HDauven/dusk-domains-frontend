import * as sdk from '@duskdomains/sdk'
import { SETTLEMENT_WINDOW_BLOCKS } from './marketplaceProtocol'
import type * as T from './commandTypes'
import { endpointBytes, local, registrationQuote, requireName } from './reads'
import { createDuskDomainsIndexerClient } from './http/client'
import { namehashHex } from './hash'
import { prepareRecordMutations } from './recordMutations'
import { walletExpiry, walletSaleAmounts, withWalletDetails, type WalletCallDetails } from './walletCallDetails'
import type { WalletFrozenCall } from './transactions'
const bytes = (v: string) => sdk.fromHex(v, 32)
const changed = () =>
  new Error('On-chain terms changed. Refresh and review the latest terms before signing.')

async function walletRecipient(client: sdk.FrozenClient, authority: string, reviewed?: T.ReviewedAuthorityRecipient) {
  if (!reviewed) return `Authority ID: ${authority}`
  const mismatch = () => new Error('The recipient changed on chain. Check the address again before confirming.')
  const parsed = sdk.contractPrincipalFromWalletAccount(reviewed.address)
  if (!parsed.ok || sdk.hex(bytes(parsed.principal)) !== sdk.hex(bytes(authority))) throw mismatch()
  if (reviewed.name) {
    const recipientName = sdk.normalizeNameInput(reviewed.name)
    const destination = await requireName(client, recipientName)
    const resolved = await client.locate<sdk.RecordValue | null>(
      destination.store, sdk.nameKey(recipientName).root, 'resolve_record',
      { key: sdk.nameKey(recipientName), record_key: 'moonlight_address' },
    )
    const record = local(resolved.value)
    if (!record || !sdk.isMoonlightEndpoint(record.value) || sdk.hex(record.value) !== sdk.hex(endpointBytes(reviewed.address))) throw mismatch()
  }
  return reviewed.name ? `${reviewed.name} (${reviewed.address})` : reviewed.address
}
/** Name edits resolve the current home; existing orders retain their recorded target. */
export async function prepareFrozenCall(
  client: sdk.FrozenClient,
  request: T.DuskDomainCallMetadata,
  spelling: string,
  account: string,
): Promise<import('./transactions').WalletFrozenCall> {
  const sender = endpointBytes(account),
    actor = sdk.authority({ kind: 'Moonlight', bytes: sender })
  const height = await client.transport.currentBlockHeight(),
    deadline = height + 120n
  const op = request.functionName
  const describe = (call: WalletFrozenCall, summary: string, fields: WalletCallDetails = {}) =>
    withWalletDetails(call, summary, { Name: spelling, ...fields })
  const money = sdk.formatLuxAsDusk
  const expiry = (heightValue: bigint) => walletExpiry(heightValue, height)
  const years = (count: number) => `${count} ${count === 1 ? 'year' : 'years'}`
  if (op === 'commit') {
    if (!request.contractId) throw new Error('Original commitment store is required')
    return describe(sdk.storeCommitCall(request.contractId, {
      hash: bytes((request.args as T.CoreCommitRuntimeArgs).commitment),
    }), `Reserve ${spelling} for registration`, { Price: '0 DUSK', 'Next step': 'Register and pay the registration price in a separate transaction' })
  }
  if (op === 'complete_registration') {
    const a = request.args as T.CoreCompleteRegistrationRuntimeArgs
    if (!a.commitmentStore || !a.directory || sdk.contractId(a.directory) !== client.directoryId)
      throw new Error('Reservation belongs to another deployment')
    const pending = await client
      .store(a.commitmentStore)
      .pending_commitment({ actor, hash: bytes(a.commitment) })
    if (!pending) throw new Error('Reservation is missing or expired. Reserve this name again.')
    if (sdk.registrationCommitWindow(pending.created_at, height).status !== 'ready')
      throw new Error('Reservation is outside the reveal window')
    const priced = await registrationQuote(client, spelling, a.durationYears, '0x' + sdk.hex(actor))
    if (BigInt(priced.quote.total_lux) !== BigInt(a.feeLux)) throw changed()
    if (request.quote && sdk.stringifyJson(request.quote) !== sdk.stringifyJson(priced.quote)) {
      // The observation height may change; economic and policy bindings must not.
      if (
        request.quote.total_lux !== priced.quote.total_lux ||
        request.quote.policy_version !== priced.quote.policy_version ||
        request.quote.quote.config_version !== priced.quote.quote.config_version ||
        sdk.hex(request.quote.policy) !== sdk.hex(priced.quote.policy)
      )
        throw changed()
    }
    const call = sdk.registrationCalls(priced.store, {
      actor,
      label: a.label,
      years: a.durationYears,
      secret: bytes(a.secret),
      commitmentStore: a.commitmentStore,
      commitHeight: pending.created_at,
      quote: priced.quote,
      referrer: a.referrer,
      records: a.records.map((r) => sdk.createRecordInput(r.key, r.value, BigInt(r.ttlSeconds))),
      primary: a.primaryEndpoint ? endpointBytes(a.primaryEndpoint.endpointValue) : null,
    }).reveal
    return describe(call, `Register ${spelling} for ${years(a.durationYears)}: ${money(call.deposit)}`, {
      Duration: years(a.durationYears), Price: money(call.deposit),
      Records: a.records.map(record => record.key).join(', ') || 'None',
      'Primary name': a.primaryEndpoint ? spelling : 'Unchanged',
    })
  }
  if (request.contract === 'vault') {
    if (op === 'claim_all_referral_rewards' || op === 'claim_referral_reward') {
      const a = request.args as T.TreasuryClaimReferralRewardRuntimeArgs
      const all = op === 'claim_all_referral_rewards'
      const amount = all ? (await client.vault.read_referral({ beneficiary: { kind: 'Moonlight', bytes: sender } }))?.claimable_lux ?? '0' : String(a.amountLux)
      return withWalletDetails(sdk.vaultClaimReferralCall(client.vaultId, {
        amount: op === 'claim_all_referral_rewards' ? 'All' : { Exact: String(a.amountLux) },
        recipient: endpointBytes(a.recipient),
      }), all ? `Claim all Dusk Domains referral rewards: currently ${money(amount)}` : `Claim ${money(amount)} in Dusk Domains referral rewards`, {
        Rewards: money(amount), Recipient: a.recipient, ...(all ? { Amount: 'All available rewards at execution' } : {}),
      })
    }
    if (op === 'claim_all' || op === 'claim') {
      const config = await client.directory.config()
      if (
        request.expectedRecipient &&
        sdk.hex(config.operator.recipient) !== sdk.hex(endpointBytes(request.expectedRecipient))
      )
        throw changed()
      const all = op === 'claim_all'
      const amount = all ? (await client.vault.read_state()).protocol_lux : String((request.args as T.TreasuryClaimRuntimeArgs).amountLux)
      return withWalletDetails(sdk.vaultClaimProtocolCall(client.vaultId, {
        amount:
          op === 'claim_all'
            ? 'All'
            : { Exact: String((request.args as T.TreasuryClaimRuntimeArgs).amountLux) },
        expected_operator_epoch: config.operator_epoch,
      }), all ? `Withdraw all treasury funds: currently ${money(amount)}` : `Withdraw ${money(amount)} from the Dusk Domains treasury`, {
        Withdrawal: money(amount), Recipient: sdk.encodeBase58(Uint8Array.from(config.operator.recipient)),
        ...(all ? { Amount: 'All available treasury funds at execution' } : {}),
      })
    }
    throw new Error('Operator changes require a directory governance proposal.')
  }
  if (request.contract === 'directory')
    throw new Error('Pricing changes require a reviewed directory proposal or a replacement policy.')
  if (op === 'clear_primary_name') {
    const a = request.args as T.CoreClearPrimaryNameRuntimeArgs,
      endpoint = endpointBytes(a.endpointValue),
      { stores } = await client.discover()
    for (const s of stores) {
      const store = sdk.contractId(s.id),
        p = await client.store(store).read_primary({ endpoint })
      if (p)
        return withWalletDetails(sdk.storeClearPrimaryCall(store, { endpoint, expected_mapping_id: p.primary.mapping_id }),
          `Clear ${p.spelling} as your primary name`, { Name: p.spelling, 'Dusk address': a.endpointValue })
    }
    throw new Error('Primary name is already cleared.')
  }
  const config = await client.directory.config()
  if (op === 'claim_refund') {
    const target = request.contractId ?? config.preferred_marketplace
    if (!target) throw new Error('Marketplace unavailable')
    await client.verifyContract('marketplace', sdk.contractId(target))
    const refund = await client.marketplace(sdk.contractId(target)).read_refund({ authority: actor })
    return withWalletDetails(sdk.marketplaceClaimRefundCall(sdk.contractId(target), {
      amount: 'All',
      recipient: sender,
    }), `Withdraw ${money(refund.amount_lux)} in marketplace refunds for all names`, {
      Names: 'All names in this marketplace', Refund: money(refund.amount_lux), Recipient: account,
      Amount: 'All available refunds at execution; the balance may change before approval',
    })
  }
  const node = (request.args as { node?: string }).node
  if (op !== 'create_subname' && node && namehashHex(spelling) !== node.toLowerCase())
    throw new Error('The request does not match this name')
  const existingOrderAction = [
    'accept_marketplace_offer',
    'buy_fixed_sale',
    'place_bid',
    'cancel_fixed_sale',
    'expire_fixed_sale',
    'cancel_auction',
    'expire_auction',
    'cancel_offer',
    'expire_offer',
    'settle_auction',
  ].includes(op)
  if (existingOrderAction) {
    // An order remains at its original marketplace/store even after a name or preferred market moves.
    if (!request.contractId) throw new Error('Review the recorded marketplace before signing.')
    const marketId = sdk.contractId(request.contractId)
    await client.verifyContract('marketplace', marketId)
    const market = client.marketplace(marketId)
    const calls = sdk.createMarketplaceCalls(
      marketId,
      client.directoryId,
      client.release.drivers.get(marketId)!,
    )
    // Value-bearing order actions carry the complete canonical order captured at review.
    const reviewed = request.reviewedOrder
    if (!reviewed) throw new Error('Review the current marketplace order before signing.')
    const current = await market.read_order({ id: reviewed.terms.id })
    if (
      !current ||
      sdk.stringifyJson(current.terms) !== sdk.stringifyJson(reviewed.terms) ||
      current.nonce !== reviewed.nonce ||
      current.status !== reviewed.status
    )
      throw changed()
    if (
      sdk.contractId(current.terms.directory) !== client.directoryId ||
      '0x' + sdk.hex(current.terms.name.key.node) !== namehashHex(spelling)
    )
      throw changed()
    if (op === 'accept_marketplace_offer') {
      const n = await requireName(client, spelling)
      if (
        n.store !== sdk.contractId(current.terms.store) ||
        sdk.stringifyJson(n.ref) !== sdk.stringifyJson(current.terms.name) ||
        sdk.hex(n.view.name.owner) !== sdk.hex(current.terms.seller) ||
        sdk.hex(n.view.name.manager) !== sdk.hex(current.terms.seller_manager)
      )
        throw changed()
      const a = request.args as T.CoreAcceptMarketplaceOfferRuntimeArgs
      if (sdk.hex(current.terms.seller_recipient) !== sdk.hex(endpointBytes(a.sellerRecipient)))
        throw new Error(
          'This offer pays a different seller address. Review that address before accepting.',
        )
      return describe(calls.acceptOffer(current, n.view.counters!.next_custody, deadline),
        `Accept the offer for ${spelling}: ${money(current.terms.amount_lux)}`, {
          ...walletSaleAmounts(current.terms.amount_lux, current.terms.fee_bps),
          Ownership: 'Transfers to the buyer', Records: 'Clear records and primary name',
        })
    }
    if (op === 'buy_fixed_sale') {
      const a = request.args as T.MarketplaceBuyFixedSaleRuntimeArgs
      return describe(calls.buy(current, bytes(a.buyerManager || '0x' + sdk.hex(actor)), deadline),
        `Buy ${spelling} for ${money(current.terms.amount_lux)}`, {
          ...walletSaleAmounts(current.terms.amount_lux, current.terms.fee_bps),
          Refund: 'No refund after a successful purchase',
        })
    }
    if (op === 'place_bid') {
      const a = request.args as T.MarketplacePlaceBidRuntimeArgs
      return describe(calls.bid(
        current,
        String(a.amountLux),
        bytes(a.bidderManager || '0x' + sdk.hex(actor)),
        deadline,
      ), `Bid ${money(String(a.amountLux))} on ${spelling}`, {
        'Held in escrow (refundable)': money(String(a.amountLux)),
        Refund: 'If outbid (including raising your own bid), withdraw the previous bid separately. If the auction expires without settlement, close it then withdraw. Winning bids pay for the name; bids cannot be canceled.',
        ...(current.highest ? { 'Previous bid': money(current.highest.amount_lux) } : {}),
        ...(current.end !== null ? { 'Auction end (estimated)': expiry(current.end) } : { Duration: `${Number(current.terms.duration_blocks) / 8640} days after the first bid (estimated)` }),
      })
    }
    if (current.status === 'ReturnPending') return describe(calls.retryReturn(current),
      `Return ${spelling} from marketplace escrow`, { Refund: 'No additional refund; withdraw any available balance separately' })
    if (op.startsWith('cancel_') || op.startsWith('expire_')) {
      const kind = current.terms.kind === 'Fixed' ? 'listing' : current.terms.kind === 'Auction' ? 'auction' : 'offer'
      const refund = current.terms.kind === 'Offer' ? current.terms.amount_lux : current.highest?.amount_lux ?? '0'
      const cancel = op.startsWith('cancel_')
      return describe(cancel ? calls.cancel(current) : calls.expire(current),
        `${cancel ? 'Cancel the' : 'Close the expired'} ${kind} for ${spelling}${BigInt(refund) > 0n ? `: refund ${money(refund)}` : ''}`, {
          [current.terms.kind === 'Auction' ? 'Minimum bid' : 'Price']: money(current.terms.amount_lux),
          Refund: money(refund),
          ...(BigInt(refund) > 0n ? { 'Refund availability': `The ${kind === 'offer' ? 'offer maker' : 'bidder'} withdraws separately after this transaction` } : {}),
          ...(kind !== 'offer' ? { Ownership: 'Return the name separately if return is pending' } : {}),
        })
    }
    if (op === 'settle_auction') {
      if (current.end !== null && height >= current.end + BigInt(SETTLEMENT_WINDOW_BLOCKS))
        throw new Error(
          'The settlement window closed. Close the auction to unlock the refund and return the name.',
        )
      return describe(calls.settle(current), `Settle the auction for ${spelling}`, {
        ...walletSaleAmounts(current.highest?.amount_lux ?? current.terms.amount_lux, current.terms.fee_bps, !current.highest),
        Payment: 'Uses the winning bid already held in escrow', Refund: 'No refund of the winning bid after successful settlement',
      })
    }
  }
  // Creating a child targets the parent's home and incarnation.
  if (op === 'create_subname') {
    const a = request.args as T.CoreCreateSubnameRuntimeArgs,
      n = await requireName(client, a.parentName)
    return describe(sdk.storeCreateSubnameCall(n.store, {
      parent: n.ref,
      node: bytes(a.node),
      label: a.label,
      owner: bytes(a.owner),
      manager: bytes(a.manager),
      expires_at: BigInt(a.expiresAt),
      expiry_policy: a.expiryPolicy === 'inherits_parent' ? 'InheritsParent' : 'FixedBeforeParent',
    }), `Create ${a.name}`, {
      Name: a.name, Subdomain: a.name, Parent: a.parentName,
      'Expiry (estimated)': expiry(BigInt(a.expiresAt)),
      'Expiry policy': a.expiryPolicy === 'inherits_parent' ? 'Expires with its parent' : 'Fixed date', Records: 'None; add records separately',
    })
  }
  const n = await requireName(client, spelling)
  if (request.nameRef && sdk.stringifyJson(request.nameRef) !== sdk.stringifyJson(n.ref)) throw changed()
  switch (op) {
    case 'renew': {
      const a = request.args as T.CoreRenewRuntimeArgs,
        q = await client.quoteRenewal(n.store, { name: n.ref, years: a.durationYears }),
        v = local(q.value)
      if (
        !v ||
        BigInt(v.total_lux) !== BigInt(a.feeLux) ||
        (request.expectedScheduleVersion !== undefined &&
          request.expectedScheduleVersion !== v.schedule_version)
      )
        throw changed()
      return describe(sdk.storeRenewCall(q.store, {
        name: n.ref,
        years: a.durationYears,
        expected_schedule_version: v.schedule_version,
        expected_fee_lux: v.total_lux,
        valid_until: deadline,
      }), `Renew ${spelling} for ${years(a.durationYears)}: ${money(v.total_lux)}`, {
        Duration: years(a.durationYears), Price: money(v.total_lux), 'New expiry (estimated)': expiry(v.new_expiry),
      })
    }
    case 'update_authorities': {
      const a = request.args as T.CoreUpdateAuthoritiesRuntimeArgs
      const reviewed = request.reviewedRecipient
      if (reviewed?.kind === 'transfer' && sdk.hex(bytes(a.owner)) !== sdk.hex(bytes(a.manager)))
        throw new Error('The recipient changed on chain. Check the address again before confirming.')
      const recipients = request.reviewedAuthorities
      const destinations: WalletCallDetails = recipients || request.authorityAction
        ? { 'New owner': await walletRecipient(client, a.owner, recipients?.owner),
          'New manager': await walletRecipient(client, a.manager, recipients?.manager) }
        : { Recipient: await walletRecipient(client, a.manager, reviewed) }
      const summary = request.authorityAction === 'take_back' ? `Take back ${spelling}`
        : request.authorityAction === 'reassign' ? `Reassign ${spelling}`
        : sdk.hex(bytes(a.owner)) === sdk.hex(n.view.name.owner) ? `Change the manager of ${spelling}`
        : `Transfer ${spelling} to a new owner`
      return describe(sdk.transferCall(n.store, {
        name: n.ref,
        owner: bytes(a.owner),
        manager: bytes(a.manager),
        clear_records: a.clearRecords ?? false,
      }), summary, {
        Records: a.clearRecords ? 'Clear records and primary name' : 'Keep existing records',
        ...destinations,
      })
    }
    case 'mutate_records_sender': {
      const a = request.args as T.CoreMutateRecordsSenderRuntimeArgs
      return describe(sdk.storeMutateRecordsCall(n.store, {
        name: n.ref,
        mutations: prepareRecordMutations(a.mutations),
      }), `Update records for ${spelling}`, {
        Records: a.mutations.map(mutation => `${mutation.action === 'set' ? 'Set' : 'Clear'} ${mutation.key}`).join('; '),
      })
    }
    case 'set_primary_name':
      return describe(sdk.storeSetPrimaryCall(n.store, {
        name: n.ref,
        endpoint: endpointBytes((request.args as T.CoreSetPrimaryNameRuntimeArgs).endpointValue),
      }), `Set ${spelling} as your primary name`, { 'Dusk address': (request.args as T.CoreSetPrimaryNameRuntimeArgs).endpointValue })
    case 'remove_subname':
      return describe(sdk.storeRemoveSubnameCall(n.store, { name: n.ref }), `Remove ${spelling} and all its descendants`, {
        Records: 'Clear records and primary names of this name and every subname beneath it',
        ...(request.knownDescendants?.length ? { 'Known descendants': request.knownDescendants.join(', ') } : {}),
      })
    case 'take_back_subnames': {
      const a = request.args as T.CoreTakeBackSubnamesRuntimeArgs,
        indexer = createDuskDomainsIndexerClient({ baseUrl: client.release.manifest.indexerUrl })
      const subnames: string[] = []
      const targets = await Promise.all(
        a.nodes.map(async (node) => {
          const v = await indexer.getNameState(node)
          if (!v?.canonicalName || namehashHex(v.canonicalName) !== node.toLowerCase()) throw changed()
          const t = await requireName(client, v.canonicalName)
          if (t.store !== n.store) throw changed()
          subnames.push(v.canonicalName)
          return t.ref
        }),
      )
      return describe(sdk.storeTakeBackSubnamesCall(n.store, {
        ancestor: n.ref,
        targets,
        owner: bytes(a.owner),
        manager: bytes(a.manager),
      }), `Take back subnames of ${spelling}`, { Subdomains: subnames.sort().join(', '), Records: 'Clear records and primary names of these subnames' })
    }
  }
  if (!config.preferred_marketplace) throw new Error('Marketplace unavailable')
  const marketId = sdk.contractId(config.preferred_marketplace)
  const expectedMarket =
    request.contractId ?? (request.args as { marketplaceContract?: string }).marketplaceContract
  if (expectedMarket && sdk.contractId(expectedMarket) !== marketId) throw changed()
  await client.verifyContract('marketplace', marketId)
  const driver = client.release.drivers.get(marketId)!
  const calls = sdk.createMarketplaceCalls(marketId, client.directoryId, driver),
    market = client.marketplace(marketId)
  if (op === 'escrow_fixed_sale' || op === 'escrow_auction' || op === 'place_offer') {
    const a = request.args as T.CoreEscrowFixedSaleRuntimeArgs &
      T.CoreEscrowAuctionRuntimeArgs &
      T.MarketplacePlaceOfferRuntimeArgs
    const mc = await market.config(),
      kind = op === 'escrow_fixed_sale' ? 'Fixed' : op === 'escrow_auction' ? 'Auction' : 'Offer'
    if (request.expectedFeeBps !== undefined && request.expectedFeeBps !== mc.fee_bps) throw changed()
    let recipient = a.sellerRecipient ? endpointBytes(a.sellerRecipient) : null
    if (kind === 'Offer') {
      // The offer binds the seller's payout. Resolve it and verify its authority before review/signing.
      const record = local(
        await client.store(n.store).resolve_record({ key: n.ref.key, record_key: 'moonlight_address' }),
      )
      if (
        !record ||
        !sdk.isMoonlightEndpoint(record.value) ||
        sdk.hex(sdk.authority({ kind: 'Moonlight', bytes: record.value })) !== sdk.hex(n.view.name.owner)
      )
        throw new Error(
          'The owner must set their public Dusk address before this name can receive offers.',
        )
      recipient = record.value
    }
    if (!recipient) throw new Error('Seller payout address is required')
    const terms: sdk.Terms = {
      version: 1,
      directory: bytes(client.directoryId),
      store: bytes(n.store),
      name: n.ref,
      id: mc.next_order_id,
      kind,
      amount_lux: String(
        kind === 'Fixed' ? a.priceLux : kind === 'Auction' ? a.reservePriceLux : a.amountLux,
      ),
      fee_bps: mc.fee_bps,
      seller: n.view.name.owner,
      seller_manager: n.view.name.manager,
      seller_recipient: recipient,
      buyer: kind === 'Offer' ? actor : a.privateBuyer ? bytes(a.privateBuyer) : null,
      buyer_manager: kind === 'Offer' ? bytes(a.buyerManager || '0x' + sdk.hex(actor)) : null,
      deadline: kind === 'Auction' ? height + 7n * 8640n : BigInt(a.expiresAt),
      duration_blocks: kind === 'Auction' ? BigInt(a.durationBlocks) : 0n,
      referral: null,
    }
    if (kind === 'Offer') return describe(calls.offer(terms, deadline), `Offer ${money(terms.amount_lux)} for ${spelling}`, {
      'Held in escrow (refundable)': money(terms.amount_lux), 'Expiry (estimated)': expiry(terms.deadline),
      Refund: 'Cancel before acceptance, or close after expiry, then withdraw separately. No refund after acceptance.',
    })
    const intent = { terms, nonce: n.view.counters!.next_custody, valid_until: deadline }
    return describe(kind === 'Fixed' ? calls.listFixed(intent) : calls.auction(intent),
      kind === 'Fixed' ? `List ${spelling} for ${money(terms.amount_lux)}` : `Auction ${spelling} with a minimum bid of ${money(terms.amount_lux)}`, {
        ...walletSaleAmounts(terms.amount_lux, terms.fee_bps, kind === 'Auction'),
        'Fee payment': 'Deducted from the sale price only if sold',
        ...(kind === 'Fixed' ? { 'Expiry (estimated)': expiry(terms.deadline) } : {
          'Start by (estimated)': expiry(terms.deadline), Duration: `${Number(terms.duration_blocks) / 8640} days after the first bid (estimated; late bids can extend it)`,
        }),
        Ownership: 'Held in marketplace escrow until sold or returned',
      })
  }
  throw new Error(`Unsupported application action: ${op}`)
}
