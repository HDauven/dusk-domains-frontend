import * as sdk from '@duskdomains/sdk'
import { SETTLEMENT_WINDOW_BLOCKS } from './marketplaceProtocol'
import type * as T from './commandTypes'
import { endpointBytes, local, registrationQuote, requireName } from './reads'
import { createDuskDomainsIndexerClient } from './http/client'
import { namehashHex } from './hash'
import { prepareRecordMutations } from './recordMutations'
const bytes = (v: string) => sdk.fromHex(v, 32)
const changed = () =>
  new Error('On-chain terms changed. Refresh and review the latest terms before signing.')
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
  if (op === 'commit') {
    if (!request.contractId) throw new Error('Original commitment store is required')
    return sdk.storeCommitCall(request.contractId, {
      hash: bytes((request.args as T.CoreCommitRuntimeArgs).commitment),
    })
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
    return sdk.registrationCalls(priced.store, {
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
  }
  if (request.contract === 'vault') {
    if (op === 'claim_all_referral_rewards' || op === 'claim_referral_reward') {
      const a = request.args as T.TreasuryClaimReferralRewardRuntimeArgs
      return sdk.vaultClaimReferralCall(client.vaultId, {
        amount: op === 'claim_all_referral_rewards' ? 'All' : { Exact: String(a.amountLux) },
        recipient: endpointBytes(a.recipient),
      })
    }
    if (op === 'claim_all' || op === 'claim') {
      const config = await client.directory.config()
      if (
        request.expectedRecipient &&
        sdk.hex(config.operator.recipient) !== sdk.hex(endpointBytes(request.expectedRecipient))
      )
        throw changed()
      return sdk.vaultClaimProtocolCall(client.vaultId, {
        amount:
          op === 'claim_all'
            ? 'All'
            : { Exact: String((request.args as T.TreasuryClaimRuntimeArgs).amountLux) },
        expected_operator_epoch: config.operator_epoch,
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
        return sdk.storeClearPrimaryCall(store, { endpoint, expected_mapping_id: p.primary.mapping_id })
    }
    throw new Error('Primary name is already cleared.')
  }
  const config = await client.directory.config()
  if (op === 'claim_refund') {
    const target = request.contractId ?? config.preferred_marketplace
    if (!target) throw new Error('Marketplace unavailable')
    await client.verifyContract('marketplace', sdk.contractId(target))
    return sdk.marketplaceClaimRefundCall(sdk.contractId(target), {
      amount: 'All',
      recipient: sender,
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
      return calls.acceptOffer(current, n.view.counters!.next_custody, deadline)
    }
    if (op === 'buy_fixed_sale') {
      const a = request.args as T.MarketplaceBuyFixedSaleRuntimeArgs
      return calls.buy(current, bytes(a.buyerManager || '0x' + sdk.hex(actor)), deadline)
    }
    if (op === 'place_bid') {
      const a = request.args as T.MarketplacePlaceBidRuntimeArgs
      return calls.bid(
        current,
        String(a.amountLux),
        bytes(a.bidderManager || '0x' + sdk.hex(actor)),
        deadline,
      )
    }
    if (current.status === 'ReturnPending') return calls.retryReturn(current)
    if (op.startsWith('cancel_')) return calls.cancel(current)
    if (op.startsWith('expire_')) return calls.expire(current)
    if (op === 'settle_auction') {
      if (current.end !== null && height >= current.end + BigInt(SETTLEMENT_WINDOW_BLOCKS))
        throw new Error(
          'The settlement window closed. Close the auction to unlock the refund and return the name.',
        )
      return calls.settle(current)
    }
  }
  // Creating a child targets the parent's home and incarnation.
  if (op === 'create_subname') {
    const a = request.args as T.CoreCreateSubnameRuntimeArgs,
      n = await requireName(client, a.parentName)
    return sdk.storeCreateSubnameCall(n.store, {
      parent: n.ref,
      node: bytes(a.node),
      label: a.label,
      owner: bytes(a.owner),
      manager: bytes(a.manager),
      expires_at: BigInt(a.expiresAt),
      expiry_policy: a.expiryPolicy === 'inherits_parent' ? 'InheritsParent' : 'FixedBeforeParent',
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
      return sdk.storeRenewCall(q.store, {
        name: n.ref,
        years: a.durationYears,
        expected_schedule_version: v.schedule_version,
        expected_fee_lux: v.total_lux,
        valid_until: deadline,
      })
    }
    case 'update_authorities': {
      const a = request.args as T.CoreUpdateAuthoritiesRuntimeArgs
      if (request.reviewedRecipient) {
        const reviewed = request.reviewedRecipient
        const recipientName = sdk.normalizeNameInput(reviewed.name)
        const destination = await requireName(client, recipientName)
        const resolved = await client.locate<sdk.RecordValue | null>(
          destination.store,
          sdk.nameKey(recipientName).root,
          'resolve_record',
          { key: sdk.nameKey(recipientName), record_key: 'moonlight_address' },
        )
        const record = local(resolved.value)
        const endpoint = endpointBytes(reviewed.address)
        const authority = sdk.hex(sdk.authority({ kind: 'Moonlight', bytes: endpoint }))
        if (
          !record ||
          !sdk.isMoonlightEndpoint(record.value) ||
          sdk.hex(record.value) !== sdk.hex(endpoint) ||
          sdk.hex(bytes(a.manager)) !== authority ||
          (reviewed.kind === 'transfer' && sdk.hex(bytes(a.owner)) !== authority)
        )
          throw new Error('The recipient changed on chain. Check the address again before confirming.')
      }
      return sdk.transferCall(n.store, {
        name: n.ref,
        owner: bytes(a.owner),
        manager: bytes(a.manager),
        clear_records: a.clearRecords ?? false,
      })
    }
    case 'mutate_records_sender': {
      const a = request.args as T.CoreMutateRecordsSenderRuntimeArgs
      return sdk.storeMutateRecordsCall(n.store, {
        name: n.ref,
        mutations: prepareRecordMutations(a.mutations),
      })
    }
    case 'set_primary_name':
      return sdk.storeSetPrimaryCall(n.store, {
        name: n.ref,
        endpoint: endpointBytes((request.args as T.CoreSetPrimaryNameRuntimeArgs).endpointValue),
      })
    case 'remove_subname':
      return sdk.storeRemoveSubnameCall(n.store, { name: n.ref })
    case 'take_back_subnames': {
      const a = request.args as T.CoreTakeBackSubnamesRuntimeArgs,
        indexer = createDuskDomainsIndexerClient({ baseUrl: client.release.manifest.indexerUrl })
      const targets = await Promise.all(
        a.nodes.map(async (node) => {
          const v = await indexer.getNameState(node)
          if (!v?.canonicalName || namehashHex(v.canonicalName) !== node.toLowerCase()) throw changed()
          const t = await requireName(client, v.canonicalName)
          if (t.store !== n.store) throw changed()
          return t.ref
        }),
      )
      return sdk.storeTakeBackSubnamesCall(n.store, {
        ancestor: n.ref,
        targets,
        owner: bytes(a.owner),
        manager: bytes(a.manager),
      })
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
    if (kind === 'Offer') return calls.offer(terms, deadline)
    const intent = { terms, nonce: n.view.counters!.next_custody, valid_until: deadline }
    return kind === 'Fixed' ? calls.listFixed(intent) : calls.auction(intent)
  }
  throw new Error(`Unsupported application action: ${op}`)
}
