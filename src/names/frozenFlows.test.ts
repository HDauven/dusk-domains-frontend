import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import * as sdk from '@duskdomains/sdk'
import { handoff, handoffDrivers } from '../test/handoffFixtures'
import { createDuskDomainsConnectApp } from '@duskdomains/sdk/connect-app'
import { account, reservation } from '../test/frozenFixtures'
import { prepareFrozenCall } from './prepareFrozenCall'
import { submitDuskDomainWrite } from './transactions'
import * as intent from './commands'
import { namehashHex } from './hash'
import { endpointBytes, recordView, createDuskDomainsOnChainClient } from './reads'
import {
  registrationCommitWindow,
  listPendingNameReservations,
  upsertPendingNameReservation,
} from './reservations'
import { frozenView } from './http/frozenViews'
beforeEach(() =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('Unexpected network request')
    }),
  ),
)
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
const samples = sdk.parseJson(readFileSync('src/test/frozen-wire.json', 'utf8')) as Record<
  string,
  unknown
>
const sample = <T extends keyof sdk.WireTypes>(type: T): sdk.WireTypes[T] =>
  sdk.wireValue(type, structuredClone(samples[type]))
const id = (n: number) => n.toString(16).padStart(2, '0').repeat(32),
  bytes = (n: number) => Array(32).fill(n)
const encode = (v: unknown) => new TextEncoder().encode(sdk.stringifyJson(v)),
  decode = (v: Uint8Array) => sdk.parseJson(new TextDecoder().decode(v))
const realDrivers = await handoffDrivers()
const node = namehashHex('example.dusk')
function fixture() {
  const roles = [
    ...(['directory', 'policy', 'store', 'vault', 'resolver', 'marketplace'] as const),
    'store' as const,
  ]
  const entries = roles.map((role, i) => ({
    role,
    contractId: id(i + 1),
    dataDriver: { path: `/${role}.wasm`, sha256: '00'.repeat(32) },
  }))
  const encoded: Array<{ method: string; args: unknown }> = []
  // Inputs (including custody callbacks) use the handoff WASM. Only node replies are mocked.
  const drivers = new Map(
    entries.map((c) => {
      const driver = realDrivers.get(c.role)!
      return [
        c.contractId,
        {
          ...driver,
          encodeInput: (method: string, json: string) => {
            encoded.push({ method, args: sdk.parseJson(json) })
            return driver.encodeInput(method, json)
          },
          decodeOutput: (_: string, b: Uint8Array) => decode(b),
        },
      ]
    }),
  )
  const release: sdk.LoadedRelease = {
    manifest: {
      chainId: 'dusk:0',
      network: 0,
      nodeUrl: 'http://node.invalid',
      indexerUrl: 'http://indexer.invalid',
      contracts: entries,
    },
    contracts: new Map(entries.map((c) => [c.contractId, c])),
    drivers,
    artifactBaseUrl: 'http://release.invalid/',
  }
  const directory = sample('DirectoryConfig')
  directory.binding = { directory: bytes(1), vault: bytes(4), network: 0 }
  directory.store_count = 2
  directory.resolver_count = 1
  directory.registration.policy = bytes(2)
  directory.registration.newest_store = bytes(7)
  directory.preferred_marketplace = bytes(6)
  directory.operator_epoch = 9n
  const name = sample('NameView')
  name.name.key = sdk.nameKey('example.dusk')
  name.name.label = 'example'
  name.name.incarnation = { generation: 7n, serial: 1n }
  name.name.owner = sdk.authority({ kind: 'Moonlight', bytes: endpointBytes(account) })
  name.name.manager = name.name.owner
  name.name.custody = null
  name.name.expires_at = 5000n
  name.name.grace_end = 6000n
  name.counters!.next_custody = 8n
  const quote = sample('RegistrationQuote')
  quote.policy = bytes(2)
  quote.quote.base_lux = '10000000000'
  quote.quote.premium_lux = '0'
  quote.total_lux = '10000000000'
  quote.quote.registration_open = true
  quote.quote.label_status = 'Public'
  quote.quote.valid_until = 105n
  const renewal = sample('RenewalQuote')
  renewal.total_lux = '17000000000'
  renewal.new_expiry = 9000n
  renewal.new_grace_end = 10000n
  const market = sample('Config')
  market.fee_bps = 250
  market.next_order_id = 12n
  let height = 106n
  const responses = new Map<string, unknown>(),
    calls: Array<{ target: string; method: string; args: unknown }> = []
  const admissions = [3, 7].map((n, ordinal) => ({
    ...sample('Admission'),
    id: bytes(n),
    ordinal,
    admitted_at: 1n,
  }))
  const transport: sdk.ReadTransport = {
    currentBlockHeight: async () => height,
    read: async (target, method, b) => {
      const args = drivers.get(target)!.decodeInput(method, b)
      calls.push({ target, method, args })
      if (responses.has(`${target}:${method}`)) return encode(responses.get(`${target}:${method}`))
      const role = release.contracts.get(target)!.role
      if (method === 'interface_version')
        return encode({
          kind: role[0].toUpperCase() + role.slice(1),
          version: 1,
          move_version: role === 'store' ? 1 : 0,
          custody_version: role === 'store' || role === 'marketplace' ? 1 : 0,
        })
      if (method === 'binding') return encode(directory.binding)
      if (method === 'order_api_version') return encode(1)
      if (method === 'members')
        return encode({
          rows:
            (args as { kind: string }).kind === 'Store'
              ? admissions
              : [{ ...sample('Admission'), id: bytes(5), ordinal: 0 }],
          next: null,
        })
      if (method === 'config')
        return encode(
          role === 'directory' ? directory : role === 'policy' ? sdk.launchPolicyConfig() : market,
        )
      if (method === 'registration_context') return encode(directory.registration)
      if (method === 'home')
        return encode(
          target === id(3)
            ? {
                Forwarded: {
                  root: (args as { root: number[] }).root,
                  destination: bytes(7),
                  destination_ordinal: 1,
                  move_id: bytes(9),
                  generation: 7n,
                  completed_at: 100n,
                },
              }
            : 'Local',
        )
      if (method === 'get_name') return encode({ Local: { ...name, name: { ...name.name, key: args } } })
      if (method === 'quote_registration') return encode(quote)
      if (method === 'quote_renewal') return encode({ Local: renewal })
      if (method === 'read_refund') return encode({ authority: name.name.owner, amount_lux: '25000000000' })
      if (method === 'read_state') return encode({ protocol_lux: '30000000000', liability_lux: '40000000000', accounted_lux: '70000000000', reserved_beneficiaries: 1, max_beneficiaries: 100, source_version: 1n })
      if (method === 'read_referral') return encode({ beneficiary: { kind: 'Moonlight', bytes: endpointBytes(account) }, claimable_lux: '40000000000' })
      if (method === 'pending_commitment') return encode({ key: args, created_at: 100n })
      throw new Error(`Unexpected read ${target}.${method}`)
    },
  }
  return {
    client: new sdk.FrozenClient(release, { transport }),
    release,
    calls,
    responses,
    encoded,
    name,
    quote,
    renewal,
    market,
    directory,
    setHeight: (n: bigint) => {
      height = n
    },
  }
}
it.each([
  [99, 'future'],
  [100, 'waiting'],
  [104, 'waiting'],
  [105, 'ready'],
  [8740, 'ready'],
  [8741, 'stale'],
] as const)('uses the inclusive commit window at %s', (height, status) =>
  expect(registrationCommitWindow(100, height).status).toBe(status),
)
it('recovers the exact secret, deployment and original commitment store after reload', () => {
  const memory = new Map<string, string>(),
    storage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v)
      },
    }
  const r = reservation({ committedBlockHeight: null })
  upsertPendingNameReservation(r, storage)
  expect(
    listPendingNameReservations({ directory: r.directory, controller: r.controller }, storage),
  ).toEqual([r])
  expect(listPendingNameReservations({ directory: id(8) }, storage)).toEqual([])
  expect(() => upsertPendingNameReservation({ ...r, secret: '00'.repeat(32) }, storage)).toThrow()
})
it('reveals using the original commitment store and SDK deadline, never the policy observation deadline', async () => {
  const h = fixture(),
    saved = reservation({ name: 'example.dusk', directory: id(1), commitmentStore: id(3) })
  const call = intent.storeCompleteRegistrationRequest({
    directory: id(1),
    commitmentStore: id(3),
    commitment: saved.commitment,
    secret: saved.secret,
    node,
    label: 'example',
    durationYears: 1,
    feeLux: 10e9,
    records: [],
    primaryEndpoint: null,
  })
  const reveal = await prepareFrozenCall(h.client, call, 'example.dusk', account)
  expect(reveal).toMatchObject({
    contractId: id(7),
    functionName: 'register',
    deposit: '10000000000',
    args: { commitment_store: bytes(3), valid_until: 8740n },
  })
  expect(h.calls.find((c) => c.method === 'pending_commitment')?.target).toBe(id(3))
  h.setHeight(104n)
  await expect(prepareFrozenCall(h.client, call, 'example.dusk', account)).rejects.toThrow(
    'reveal window',
  )
  h.setHeight(8741n)
  await expect(prepareFrozenCall(h.client, call, 'example.dusk', account)).rejects.toThrow(
    'reveal window',
  )
})
it('follows forwarded names for transfer and directory-priced renewal, preserving incarnation', async () => {
  const h = fixture()
  const transfer = await prepareFrozenCall(
    h.client,
    intent.storeUpdateAuthoritiesRequest({
      node,
      owner: '0x' + id(9),
      manager: '0x' + id(9),
      clearRecords: true,
    }),
    'example.dusk',
    account,
  )
  expect(transfer).toMatchObject({
    contractId: id(7),
    functionName: 'update_authorities',
    args: { clear_identity: true, name: { incarnation: { generation: 7n, serial: 1n } } },
  })
  const renew = await prepareFrozenCall(
    h.client,
    intent.storeRenewRequest({ node, durationYears: 1, feeLux: 17e9 }),
    'example.dusk',
    account,
  )
  expect(renew).toMatchObject({
    contractId: id(7),
    functionName: 'renew',
    deposit: '17000000000',
    args: { expected_schedule_version: h.renewal.schedule_version },
  })
  await expect(
    prepareFrozenCall(
      h.client,
      intent.storeRenewRequest({ node, durationYears: 1, feeLux: 10e9 }),
      'example.dusk',
      account,
    ),
  ).rejects.toThrow('terms changed')
})
it.each(['fixed', 'auction'] as const)(
  'lists %s through transfer-and-call custody on the forwarded store',
  async (kind) => {
    const h = fixture(),
      common = { node, marketplaceContract: id(6), name: 'example.dusk', sellerRecipient: account }
    const request =
      kind === 'fixed'
        ? intent.storeEscrowFixedSaleRequest({ ...common, priceLux: 10e9, expiresAt: 900 })
        : intent.storeEscrowAuctionRequest({ ...common, reservePriceLux: 10e9, durationBlocks: 8640 })
    const call = await prepareFrozenCall(
      h.client,
      { ...request, expectedFeeBps: 250 },
      'example.dusk',
      account,
    )
    expect(call).toMatchObject({
      contractId: id(7),
      functionName: 'transfer_and_call',
      deposit: '0',
      args: { target: bytes(6), name: { incarnation: { generation: 7n, serial: 1n } } },
    })
    expect(
      sdk.wireValue('CustodyIntent', h.encoded.find((x) => x.method === 'custody_intent')?.args),
    ).toMatchObject({
      nonce: 8n,
      terms: { id: 12n, fee_bps: 250, store: bytes(7), kind: kind === 'fixed' ? 'Fixed' : 'Auction' },
    })
    await expect(
      prepareFrozenCall(h.client, { ...request, expectedFeeBps: 100 }, 'example.dusk', account),
    ).rejects.toThrow('terms changed')
  },
)
it('claims protocol and referral funds from the vault with the operator epoch and explicit payout', async () => {
  const h = fixture()
  expect(
    await prepareFrozenCall(h.client, intent.vaultClaimAllRequest(), 'treasury.dusk', account),
  ).toMatchObject({
    contractId: id(4),
    functionName: 'claim_protocol',
    args: { amount: 'All', expected_operator_epoch: 9n },
  })
  expect(
    await prepareFrozenCall(
      h.client,
      intent.vaultClaimReferralRewardRequest({ amountLux: 123, recipient: account }),
      'referrals.dusk',
      account,
    ),
  ).toMatchObject({
    contractId: id(4),
    functionName: 'claim_referral',
    args: { amount: { Exact: '123' }, recipient: endpointBytes(account) },
  })
})
it('normalizes frozen vault balances without claiming to know actual balance or surplus', () => {
  const v = frozenView(
    {
      initialized: true,
      source: 'vault',
      protocolAccruedLux: '9007199254740993',
      referralLiabilityLux: '12',
      accountedLux: '9007199254741005',
      actualLux: null,
      surplusLux: null,
      operator: null,
      events: [],
    },
    '/api/treasury',
  )
  expect(v).toMatchObject({
    availableLux: '9007199254740993',
    referralClaimableLux: '12',
    actualLux: null,
    surplusLux: null,
  })
})
it('fails closed on a display height that cannot be represented exactly', () =>
  expect(() => frozenView({ expiresAtBlockHeight: '9007199254740993' }, '/api/name')).toThrow(
    'display range',
  ))
function reviewedOrder(h: ReturnType<typeof fixture>, kind: sdk.OrderKind = 'Fixed'): sdk.Order {
  const order = sample('Order')
  order.terms = {
    version: 1,
    directory: bytes(1),
    store: bytes(7),
    name: { key: h.name.name.key, incarnation: h.name.name.incarnation },
    id: 12n,
    kind,
    amount_lux: '10000000000',
    fee_bps: 250,
    seller: h.name.name.owner,
    seller_manager: h.name.name.manager,
    seller_recipient: endpointBytes(account),
    buyer: kind === 'Offer' ? bytes(9) : null,
    buyer_manager: kind === 'Offer' ? bytes(9) : null,
    deadline: 900n,
    duration_blocks: kind === 'Auction' ? 8640n : 0n,
    referral: null,
  }
  order.status = 'Open'
  order.nonce = 8n
  order.highest = null
  order.started_at = null
  order.end = null
  order.maximum_end = null
  order.bid_count = 0
  order.payer = null
  h.responses.set(`${id(6)}:read_order`, order)
  return order
}
it.each(['buy', 'bid', 'accept', 'cancel', 'expire', 'settle', 'return'] as const)(
  'builds the frozen %s call from the complete reviewed order',
  async (action) => {
    const h = fixture(),
      order = reviewedOrder(
        h,
        action === 'bid' || action === 'settle' ? 'Auction' : action === 'accept' ? 'Offer' : 'Fixed',
      )
    const requests = {
      buy: intent.marketplaceBuyFixedSaleRequest({ node, expectedSaleId: 12, priceLux: 10e9 }),
      bid: intent.marketplacePlaceBidRequest({ node, expectedAuctionId: 12, amountLux: 11e9 }),
      accept: intent.storeAcceptMarketplaceOfferRequest({
        node,
        marketplaceContract: id(6),
        buyerAuthority: '0x' + id(9),
        expectedOfferId: 12,
        expectedFeeBps: 250,
        expectedAmountLux: 10e9,
        sellerRecipient: account,
      }),
      cancel: intent.marketplaceCancelFixedSaleRequest({ node, expectedSaleId: 12 }),
      expire: intent.marketplaceExpireFixedSaleRequest({ node, expectedSaleId: 12 }),
      settle: intent.marketplaceSettleAuctionRequest({ node, expectedAuctionId: 12 }),
      return: intent.marketplaceCancelFixedSaleRequest({ node, expectedSaleId: 12 }),
    }
    if (action === 'return') order.status = 'ReturnPending'
    const call = await prepareFrozenCall(
      h.client,
      { ...requests[action], contractId: id(6), reviewedOrder: order },
      'example.dusk',
      account,
    )
    expect(call.functionName).toBe(
      {
        buy: 'buy_fixed',
        bid: 'place_bid',
        accept: 'transfer_and_call',
        cancel: 'cancel_order',
        expire: 'expire_order',
        settle: 'settle_auction',
        return: 'retry_return',
      }[action],
    )
    if (action === 'buy' || action === 'bid')
      expect(call.deposit).toBe(action === 'buy' ? '10000000000' : '11000000000')
    h.responses.set(`${id(6)}:read_order`, { ...order, nonce: 9n })
    await expect(
      prepareFrozenCall(
        h.client,
        { ...requests[action], contractId: id(6), reviewedOrder: order },
        'example.dusk',
        account,
      ),
    ).rejects.toThrow('terms changed')
  },
)
it('places an offer with an owner-verified payout and claims refunds from the preferred market', async () => {
  const h = fixture()
  h.responses.set(`${id(7)}:resolve_record`, {
    Local: {
      key: 'moonlight_address',
      value: endpointBytes(account),
      ttl_seconds: 60n,
      updated_at: 100n,
    },
  })
  expect(
    await prepareFrozenCall(
      h.client,
      intent.marketplacePlaceOfferRequest({ node, amountLux: 10e9, expiresAt: 900 }),
      'example.dusk',
      account,
    ),
  ).toMatchObject({
    functionName: 'place_offer',
    deposit: '10000000000',
    args: { terms: { seller_recipient: endpointBytes(account) } },
  })
  expect(
    await prepareFrozenCall(
      h.client,
      intent.marketplaceClaimRefundRequest(),
      'marketplace.dusk',
      account,
    ),
  ).toMatchObject({
    contractId: id(6),
    functionName: 'claim_refund',
    args: { recipient: endpointBytes(account), amount: 'All' },
  })
})
it('edits records, sets primary and creates subnames at the forwarded home', async () => {
  const h = fixture()
  expect(
    await prepareFrozenCall(
      h.client,
      intent.storeMutateRecordsSenderRequest({
        node,
        mutations: [{ action: 'set', key: 'website', value: 'https://example.test', ttlSeconds: 60 }],
      }),
      'example.dusk',
      account,
    ),
  ).toMatchObject({
    contractId: id(7),
    functionName: 'mutate_records',
    args: { mutations: [{ action: 'Set', key: 'website', ttl_seconds: 60n }] },
  })
  expect(
    await prepareFrozenCall(
      h.client,
      intent.storeSetPrimaryNameRequest({
        node,
        name: 'example.dusk',
        endpointType: 'moonlight_address',
        endpointValue: account,
      }),
      'example.dusk',
      account,
    ),
  ).toMatchObject({ contractId: id(7), functionName: 'set_primary' })
  expect(
    await prepareFrozenCall(
      h.client,
      intent.storeCreateSubnameRequest({
        node: namehashHex('pay.example.dusk'),
        parentNode: node,
        parentName: 'example.dusk',
        name: 'pay.example.dusk',
        label: 'pay',
        owner: '0x' + id(9),
        manager: '0x' + id(9),
        expiresAt: 5000,
        expiryPolicy: 'inherits_parent',
      }),
      'example.dusk',
      account,
    ),
  ).toMatchObject({
    contractId: id(7),
    functionName: 'create_subname',
    args: { parent: { incarnation: { generation: 7n, serial: 1n } }, expiry_policy: 'InheritsParent' },
  })
})
it.each([
  { edits: 8, extraByte: false, error: null },
  { edits: 8, extraByte: true, error: 'shorten values by at least 1 byte' },
  { edits: 9, extraByte: false, error: 'Remove 1 change before saving' },
])('guards the whole batch at call preparation: $edits edits, extra byte $extraByte', async ({ edits, extraByte, error }) => {
  const h = fixture()
  const mutations = Array.from({ length: edits }, (_, i) => ({
    action: 'set' as const, key: `text.k${i}`, value: 'é'.repeat(252) + 'a' + (extraByte && i === 0 ? 'b' : ''), ttlSeconds: 3600,
  }))
  const request = intent.storeMutateRecordsSenderRequest({ node, mutations })
  const prepareContractCall = vi.fn(async () => ({ gas: { limit: '39000000', price: '1' } }))
  const writeContract = vi.fn<intent.DuskConnectAppLike['writeContract']>(async () => ({ hash: 'ab'.repeat(32), status: 'executed' }))
  const state = await submitDuskDomainWrite({
    prepareIntent: (request, name) => prepareFrozenCall(h.client, request, name, account),
    readContract: vi.fn(), prepareContractCall, writeContract,
  }, request, { name: 'example.dusk', contracts: { store: { contractId: id(7) } } as never })
  if (error) {
    expect(state.status).toBe('failed')
    expect(state.message).toContain(error)
    expect(prepareContractCall).not.toHaveBeenCalled()
    expect(writeContract).not.toHaveBeenCalled()
  } else {
    expect(state.status).toBe('executed')
    expect(writeContract).toHaveBeenCalledOnce()
    const frozen = writeContract.mock.calls[0][0].args as sdk.FrozenCall<'store', 'mutate_records'>
    expect(frozen.args.mutations).toHaveLength(8)
    expect(frozen.args.mutations.every(m => m.action === 'Set' && m.value.length === 505)).toBe(true)
  }
})
it('decodes the lossless indexer order and retains its complete identity for review', () => {
  const h = fixture(),
    order = reviewedOrder(h)
  const row = frozenView(
    {
      orderJson: sdk.stringifyJson(order),
      orderId: '12',
      saleId: '12',
      priceLux: '10000000000',
      status: 'Open',
    },
    '/api/marketplace/fixed-sale',
  )
  expect(row).toMatchObject({ order, saleId: 12, priceLux: 10e9, returnPending: false })
})

it('keeps the vault claim history independently of the recent event window', () => {
  const claim = {
    eventType: 'protocol_claimed',
    data: {
      operator: { kind: 'Moonlight', bytes: endpointBytes(account) },
      recipient: endpointBytes(account),
      amount_lux: '9007199254740993',
      remaining_lux: '9',
    },
    txId: 'claim',
  }
  const result = frozenView(
    { source: 'vault', protocolAccruedLux: '9', referralLiabilityLux: '2', events: [], claims: [claim] },
    '/api/treasury',
  )
  expect(result).toMatchObject({
    claims: [
      { amountLux: '9007199254740993', remainingLux: '9', operatorRecipient: account, txId: 'claim' },
    ],
  })
})
it('shows binary custom resolver records as hex without failing the name page', () => {
  expect(
    recordView({ key: 'custom.binary', value: [255, 0], ttl_seconds: 60n, updated_at: 100n }).value,
  ).toBe('0xff00')
})

it('reads resolver-backed records at the forwarded store with the exact NameKey input', async () => {
  const h = fixture()
  const record = {
    key: 'website',
    value: Array.from(new TextEncoder().encode('https://example.test')),
    ttl_seconds: 60n,
    updated_at: 100n,
  }
  h.responses.set(`${id(7)}:read_records`, { Local: { pointer: null, records: [record] } })
  h.responses.set(`${id(7)}:resolve_record`, { Local: null })
  const client = createDuskDomainsOnChainClient({
    read: {
      client: Promise.resolve(h.client),
      read: async () => {
        throw new Error('No legacy reads')
      },
    },
  })
  expect(await client.getRecords('example.dusk')).toMatchObject({
    ok: true,
    value: [{ key: 'website', value: 'https://example.test' }],
  })
  expect(h.calls).toContainEqual({
    target: id(7),
    method: 'read_records',
    args: sdk.nameKey('example.dusk'),
  })
  expect(await client.resolveName('example.dusk', 'website')).toMatchObject({ ok: false })
  h.responses.set(`${id(7)}:resolve_record`, { Local: record })
  expect(await client.resolveName('example.dusk', 'website')).toMatchObject({
    ok: true,
    value: { endpoint: { type: 'website', value: 'https://example.test' } },
  })
})
it('adapts frozen bid events with the order identity and exact amount', () => {
  const h = fixture(),
    order = reviewedOrder(h, 'Auction')
  order.highest = {
    payer: { kind: 'Moonlight', bytes: endpointBytes(account) },
    manager: h.name.name.owner,
    amount_lux: '11000000000',
  }
  order.bid_count = 1
  expect(
    frozenView(
      {
        id: 'bid',
        node,
        eventType: 'order_changed',
        data: {
          order: JSON.parse(JSON.stringify(order, (_, v) => (typeof v === 'bigint' ? String(v) : v))),
        },
      },
      '/api/activity',
    ),
  ).toMatchObject({
    marketplaceAction: 'bid',
    marketplaceOrderId: String(order.terms.id),
    actor: '0x' + sdk.hex(h.name.name.owner),
    target: '11000000000',
  })
})

it.each(['transfer', 'manager', 'reassign'] as const)('shows both named and pasted destinations for %s without changing signing fields', async action => {
  const h = fixture()
  const spelling = action === 'reassign' ? 'pay.example.dusk' : 'example.dusk'
  const addresses = [account, sdk.encodeBase58(Uint8Array.from(handoff.roles.payout))]
  const details = []
  for (const address of addresses) {
    const endpoint = endpointBytes(address)
    const authority = '0x' + sdk.hex(sdk.authority({ kind: 'Moonlight', bytes: endpoint }))
    const request = {
      ...intent.storeUpdateAuthoritiesRequest({ node: namehashHex(spelling),
        owner: action === 'manager' ? '0x' + sdk.hex(h.name.name.owner) : authority,
        manager: authority, clearRecords: action !== 'manager' }),
      ...(action === 'reassign' ? { authorityAction: 'reassign' as const } : {}),
    }
    const original = await prepareFrozenCall(h.client, request, spelling, account)
    for (const named of [false, true]) {
      const recipient = { address, ...(named ? { name: 'recipient.dusk' } : {}) }
      h.responses.set(`${id(7)}:resolve_record`, { Local: { key: 'moonlight_address', value: endpoint, ttl_seconds: 60n, updated_at: 100n } })
      const call = await prepareFrozenCall(h.client, { ...request,
        ...(action === 'reassign' ? { reviewedAuthorities: { owner: recipient, manager: recipient } }
          : { reviewedRecipient: { ...recipient, kind: action } }),
      }, spelling, account)
      const destination = named ? `recipient.dusk (${address})` : address
      expect(call.display).toMatchObject(action === 'reassign'
        ? { 'New owner': destination, 'New manager': destination } : { Recipient: destination })
      expect(call).toEqual({ ...original, display: call.display })
      const app = createDuskDomainsConnectApp({ request: async () => 'dusk:0' }, h.release, { gasPrice: 1n })
      expect(await app.prepare(call as sdk.FrozenCall)).toEqual(await app.prepare(original as sdk.FrozenCall))
      if (!named) details.push(call.display)
    }
  }
  expect(details[0]).not.toEqual(details[1])
})

it.each(['address', 'contract'] as const)('shows and verifies separate subname owner and manager destinations from %s input', async input => {
  const h = fixture()
  const owner = input === 'contract' ? `contract:0x${id(8)}` : account
  const manager = input === 'contract' ? `contract:0x${id(9)}` : sdk.encodeBase58(Uint8Array.from(handoff.roles.payout))
  const request = { ...intent.storeReassignSubnameRequest({ node: namehashHex('pay.example.dusk'),
    owner: input === 'contract' ? '0x' + id(8) : '0x' + sdk.hex(h.name.name.owner),
    manager: input === 'contract' ? '0x' + id(9) : '0x' + sdk.hex(sdk.authority({ kind: 'Moonlight', bytes: endpointBytes(manager) })), clearRecords: true }),
    authorityAction: 'reassign' as const,
    reviewedAuthorities: { owner: { address: owner }, manager: { address: manager } },
  }
  const call = await prepareFrozenCall(h.client, request, 'pay.example.dusk', account)
  expect(call.display).toMatchObject({ 'New owner': owner, 'New manager': manager })
  for (const role of ['owner', 'manager'] as const) {
    await expect(prepareFrozenCall(h.client, { ...request, reviewedAuthorities: {
      ...request.reviewedAuthorities, [role]: { address: role === 'owner' ? manager : owner },
    } }, 'pay.example.dusk', account)).rejects.toThrow(/recipient/i)
  }
})

it.each(['owner', 'manager'] as const)('rechecks the named subname %s destination before signing', async role => {
  const h = fixture()
  h.responses.set(`${id(7)}:resolve_record`, { Local: null })
  await expect(prepareFrozenCall(h.client, {
    ...intent.storeReassignSubnameRequest({ node: namehashHex('pay.example.dusk'),
      owner: '0x' + sdk.hex(h.name.name.owner), manager: '0x' + sdk.hex(h.name.name.owner), clearRecords: true }),
    authorityAction: 'reassign', reviewedAuthorities: {
      owner: { address: account }, manager: { address: account }, [role]: { name: 'recipient.dusk', address: account },
    },
  }, 'pay.example.dusk', account)).rejects.toThrow(/recipient/i)
})

it.each(['transfer', 'manager'] as const)('rejects a pasted %s destination that differs from the signed authority', async kind => {
  const h = fixture()
  await expect(prepareFrozenCall(h.client, {
    ...intent.storeUpdateAuthoritiesRequest({ node, owner: '0x' + id(9), manager: '0x' + id(9) }),
    reviewedRecipient: { address: account, kind },
  }, 'example.dusk', account)).rejects.toThrow(/recipient/i)
})

it.each([undefined, [], ['api.docs.example.dusk', 'v1.api.docs.example.dusk']])('discloses cascading subname removal with known descendants %j', async knownDescendants => {
  const h = fixture()
  const spelling = 'docs.example.dusk'
  const request = intent.storeRemoveSubnameRequest({ node: namehashHex(spelling) })
  const original = await prepareFrozenCall(h.client, request, spelling, account)
  const call = await prepareFrozenCall(h.client, { ...request, knownDescendants }, spelling, account)
  expect(call.display).toMatchObject({
    Summary: 'Remove docs.example.dusk and all its descendants',
    Records: 'Clear records and primary names of this name and every subname beneath it',
  })
  if (knownDescendants?.length) expect(call.display!['Known descendants']).toBe(knownDescendants.join(', '))
  else expect(call.display).not.toHaveProperty('Known descendants')
  expect(call).toEqual({ ...original, display: call.display })
})

it('refuses a named recipient whose on-chain address differs from the reviewed address', async () => {
  const h = fixture()
  h.responses.set(`${id(7)}:resolve_record`, { Local: null })
  const request = {
    ...intent.storeUpdateAuthoritiesRequest({
      node,
      owner: '0x' + sdk.hex(h.name.name.owner),
      manager: '0x' + sdk.hex(h.name.name.owner),
    }),
    reviewedRecipient: { name: 'recipient.dusk', address: account, kind: 'transfer' as const },
  }
  await expect(prepareFrozenCall(h.client, request, 'example.dusk', account)).rejects.toThrow(
    /recipient/i,
  )
})

it.each(['cancel', 'expire', 'return'] as const)(
  'prepares %s at the recorded marketplace without requiring the current name',
  async (action) => {
    const h = fixture(),
      order = reviewedOrder(h, action === 'return' ? 'Fixed' : 'Offer')
    order.terms.store = bytes(3)
    if (action === 'return') order.status = 'ReturnPending'
    h.responses.set(`${id(7)}:get_name`, 'Absent')
    h.directory.preferred_marketplace = null
    const request =
      action === 'expire'
        ? intent.marketplaceExpireOfferRequest({
            node,
            buyerAuthority: '0x' + id(9),
            expectedOfferId: 12,
          })
        : action === 'cancel'
          ? intent.marketplaceCancelOfferRequest({ node, expectedOfferId: 12 })
          : intent.marketplaceCancelFixedSaleRequest({ node, expectedSaleId: 12 })
    await expect(
      prepareFrozenCall(
        h.client,
        { ...request, contractId: id(6), reviewedOrder: order },
        'example.dusk',
        account,
      ),
    ).resolves.toMatchObject({
      contractId: id(6),
      functionName: action === 'return' ? 'retry_return' : `${action}_order`,
      args: order,
    })
  },
)

it('finds an existing offer by recorded order identity after its name moves', async () => {
  const h = fixture(),
    order = reviewedOrder(h, 'Offer')
  order.terms.store = bytes(3)
  h.directory.preferred_marketplace = null
  const { createDuskDomainsMarketplaceOnChainClient } = await import('./reads')
  const client = createDuskDomainsMarketplaceOnChainClient({
    client: Promise.resolve(h.client),
    read: async () => {
      throw new Error('legacy read')
    },
  })
  await expect(
    client.getOffer(node, '0x' + id(9), { marketplaceContractId: id(6), name: 'example.dusk', order }),
  ).resolves.toMatchObject({ ok: true, value: { order, offerId: 12 } })
  expect(h.calls.filter((c) => c.method === 'read_order')).toEqual([
    { target: id(6), method: 'read_order', args: { id: 12 } },
  ])
  expect(h.calls.some((c) => ['home', 'get_name', 'read_offer'].includes(c.method))).toBe(false)
})

it('encodes the nested custody intent as a real marketplace archive', async () => {
  const h = fixture()
  const drivers = realDrivers
  const call = await prepareFrozenCall(
    h.client,
    intent.storeEscrowFixedSaleRequest({
      node,
      marketplaceContract: id(6),
      name: 'example.dusk',
      sellerRecipient: account,
      priceLux: 10e9,
      expiresAt: 900,
    }),
    'example.dusk',
    account,
  )
  const payload = (call.args as sdk.TransferAndCall).data
  expect(
    sdk.wireValue(
      'CustodyIntent',
      drivers.get('marketplace')!.decodeInput('custody_intent', Uint8Array.from(payload)),
    ),
  ).toMatchObject({ nonce: 8n, terms: { id: 12n, kind: 'Fixed' } })
})

const writeCases = [
  'commit',
  'register',
  'renew',
  'transfer',
  'manager',
  'reassign',
  'take_back',
  'records',
  'clear_record',
  'set_primary',
  'clear_primary',
  'create_subname',
  'remove_subname',
  'take_back_subnames',
  'fixed',
  'auction',
  'accept',
  'buy',
  'bid',
  'offer',
  'cancel_fixed',
  'expire_fixed',
  'cancel_auction',
  'expire_auction',
  'cancel_offer',
  'expire_offer',
  'settle',
  'return',
  'refund',
  'protocol_exact',
  'protocol_all',
  'referral_exact',
  'referral_all',
] as const
it.each(writeCases)(
  'round-trips the wallet signing bytes for %s through the real handoff drivers',
  async (action) => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-08T12:00:00Z'))
    const h = fixture()
    const order = reviewedOrder(
      h,
      ['bid', 'settle', 'cancel_auction', 'expire_auction'].includes(action)
        ? 'Auction'
        : ['accept', 'offer', 'cancel_offer', 'expire_offer'].includes(action)
          ? 'Offer'
          : 'Fixed',
    )
    if (action === 'return') order.status = 'ReturnPending'
    const record = {
      key: 'moonlight_address',
      value: endpointBytes(account),
      ttl_seconds: 60n,
      updated_at: 100n,
    }
    h.responses.set(`${id(7)}:resolve_record`, { Local: record })
    h.responses.set(`${id(3)}:read_primary`, {
      spelling: 'example.dusk',
      primary: {
        endpoint: endpointBytes(account),
        name: { key: h.name.name.key, incarnation: h.name.name.incarnation },
        mapping_id: 42n,
        updated_at: 100n,
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              canonicalName: 'pay.example.dusk',
              node: namehashHex('pay.example.dusk'),
              owner: null,
              manager: null,
              resolverId: null,
              expiresAt: null,
              graceEndsAt: null,
              expiresAtBlockHeight: 5000,
              graceEndsAtBlockHeight: 6000,
              status: 'active',
              lastEventType: '',
            }),
          ),
      ),
    )
    const common = { node, marketplaceContract: id(6), name: 'example.dusk', sellerRecipient: account }
    const saved = reservation({ name: 'example.dusk', directory: id(1), commitmentStore: id(3) })
    const requests: Record<(typeof writeCases)[number], intent.DuskDomainCallMetadata> = {
      commit: { ...intent.storeCommitRequest({ commitment: saved.commitment }), contractId: id(3) },
      register: intent.storeCompleteRegistrationRequest({
        directory: id(1),
        commitmentStore: id(3),
        commitment: saved.commitment,
        secret: saved.secret,
        node,
        label: 'example',
        durationYears: 1,
        feeLux: 10e9,
        records: [{ key: 'moonlight_address', value: account, ttlSeconds: 60 }],
        primaryEndpoint: { endpointType: 'moonlight_address', endpointValue: account },
      }),
      renew: intent.storeRenewRequest({ node, durationYears: 1, feeLux: 17e9 }),
      transfer: intent.storeUpdateAuthoritiesRequest({
        node,
        owner: '0x' + id(9),
        manager: '0x' + id(9),
        clearRecords: true,
      }),
      manager: intent.storeUpdateAuthoritiesRequest({ node, owner: '0x' + sdk.hex(h.name.name.owner), manager: '0x' + id(9) }),
      reassign: { ...intent.storeReassignSubnameRequest({ node, owner: '0x' + id(9), manager: '0x' + id(9), clearRecords: true }), authorityAction: 'reassign' },
      take_back: { ...intent.storeReassignSubnameRequest({ node, owner: '0x' + id(9), manager: '0x' + id(9), clearRecords: true }), authorityAction: 'take_back' },
      clear_record: intent.storeMutateRecordsSenderRequest({ node, mutations: [{ action: 'clear', key: 'avatar' }] }),
      records: intent.storeMutateRecordsSenderRequest({
        node,
        mutations: [
          { action: 'set', key: 'website', value: 'https://example.test', ttlSeconds: 60 },
          { action: 'clear', key: 'avatar' },
        ],
      }),
      set_primary: intent.storeSetPrimaryNameRequest({
        node,
        name: 'example.dusk',
        endpointType: 'moonlight_address',
        endpointValue: account,
      }),
      clear_primary: intent.storeClearPrimaryNameRequest({
        endpointType: 'moonlight_address',
        endpointValue: account,
      }),
      create_subname: intent.storeCreateSubnameRequest({
        node: namehashHex('pay.example.dusk'),
        parentName: 'example.dusk',
        parentNode: node,
        name: 'pay.example.dusk',
        label: 'pay',
        owner: '0x' + id(9),
        manager: '0x' + id(9),
        expiresAt: 5000,
        expiryPolicy: 'inherits_parent',
      }),
      remove_subname: intent.storeRemoveSubnameRequest({ node }),
      take_back_subnames: intent.storeTakeBackSubnamesRequest({
        node,
        nodes: [namehashHex('pay.example.dusk')],
        owner: '0x' + id(9),
        manager: '0x' + id(9),
      }),
      fixed: intent.storeEscrowFixedSaleRequest({ ...common, priceLux: 10e9, expiresAt: 900 }),
      auction: intent.storeEscrowAuctionRequest({
        ...common,
        reservePriceLux: 10e9,
        durationBlocks: 8640,
      }),
      accept: intent.storeAcceptMarketplaceOfferRequest({
        ...common,
        buyerAuthority: '0x' + id(9),
        expectedOfferId: 12,
        expectedFeeBps: 250,
        expectedAmountLux: 10e9,
      }),
      buy: intent.marketplaceBuyFixedSaleRequest({ node, expectedSaleId: 12, priceLux: 10e9 }),
      bid: intent.marketplacePlaceBidRequest({ node, expectedAuctionId: 12, amountLux: 11e9 }),
      offer: intent.marketplacePlaceOfferRequest({ node, amountLux: 10e9, expiresAt: 900 }),
      cancel_fixed: intent.marketplaceCancelFixedSaleRequest({ node, expectedSaleId: 12 }),
      expire_fixed: intent.marketplaceExpireFixedSaleRequest({ node, expectedSaleId: 12 }),
      cancel_auction: intent.marketplaceCancelAuctionRequest({ node, expectedAuctionId: 12 }),
      expire_auction: intent.marketplaceExpireAuctionRequest({ node, expectedAuctionId: 12 }),
      cancel_offer: intent.marketplaceCancelOfferRequest({ node, expectedOfferId: 12 }),
      expire_offer: intent.marketplaceExpireOfferRequest({
        node,
        buyerAuthority: '0x' + id(9),
        expectedOfferId: 12,
      }),
      settle: intent.marketplaceSettleAuctionRequest({ node, expectedAuctionId: 12 }),
      return: intent.marketplaceCancelFixedSaleRequest({ node, expectedSaleId: 12 }),
      refund: intent.marketplaceClaimRefundRequest(),
      protocol_exact: intent.vaultClaimRequest({ amountLux: 123 }),
      protocol_all: intent.vaultClaimAllRequest(),
      referral_exact: intent.vaultClaimReferralRewardRequest({ amountLux: 123, recipient: account }),
      referral_all: intent.vaultClaimAllReferralRewardsRequest({ recipient: account }),
    }
    const request = requests[action]
    const spelling = ['reassign', 'take_back', 'remove_subname'].includes(action) ? 'pay.example.dusk' : 'example.dusk'
    if (spelling !== 'example.dusk') (request.args as { node: string }).node = namehashHex(spelling)
    const call = await prepareFrozenCall(
      h.client,
      { ...request, contractId: request.contractId ?? id(6), reviewedOrder: order },
      spelling,
      account,
    )
    const wallet = {
      request: vi.fn(async (method: string) => {
        if (method === 'dusk_chainId') return 'dusk:0'
        throw new Error(`Unexpected wallet request ${method}`)
      }),
    }
    const prepared = await createDuskDomainsConnectApp(wallet, h.release, { gasPrice: 1n }).prepare(
      call as sdk.FrozenCall,
    )
    const { chainId, contractId, fnName, fnArgs, deposit, gas } = prepared
    expect(createHash('sha256').update(sdk.stringifyJson({ chainId, contractId, fnName, fnArgs, deposit, gas })).digest('hex')).toMatchSnapshot()
    const driver = realDrivers.get(call.role)!
    const archive = Uint8Array.from(sdk.fromHex(prepared.fnArgs))
    const decoded = sdk.wireValue(
      sdk.methodDefinition(call.role, call.functionName).input,
      driver.decodeInput(call.functionName, archive),
    )
    expect(decoded).toEqual(call.args)
    expect(archive).not.toEqual(new TextEncoder().encode(sdk.stringifyJson(call.args)))
    expect(prepared.deposit).toBe(call.deposit)
    expect(prepared.contractId).toBe(call.contractId)
    if (call.functionName === 'transfer_and_call') {
      const custody = sdk.wireValue(
        'CustodyIntent',
        realDrivers
          .get('marketplace')!
          .decodeInput('custody_intent', Uint8Array.from((decoded as sdk.TransferAndCall).data)),
      )
      expect(custody.terms.kind).toBe(
        action === 'fixed' ? 'Fixed' : action === 'auction' ? 'Auction' : 'Offer',
      )
      expect(custody.terms.store).toEqual(bytes(7))
      expect(custody.terms.seller_recipient).toEqual(endpointBytes(account))
      expect(custody.nonce).toBe(8n)
    }
    const details = call.display
    const expected = {
      commit: { Summary: 'Reserve example.dusk for registration', Price: '0 DUSK' },
      register: { Summary: 'Register example.dusk for 1 year: 10 DUSK', Price: '10 DUSK', Records: 'moonlight_address', 'Primary name': 'example.dusk' },
      renew: { Summary: 'Renew example.dusk for 1 year: 17 DUSK', Price: '17 DUSK', 'New expiry (estimated)': '2026-10-09' },
      transfer: { Summary: 'Transfer example.dusk to a new owner', Records: 'Clear records and primary name' },
      manager: { Summary: 'Change the manager of example.dusk', Records: 'Keep existing records' },
      reassign: { Summary: 'Reassign pay.example.dusk', Records: 'Clear records and primary name' },
      take_back: { Summary: 'Take back pay.example.dusk', Records: 'Clear records and primary name' },
      records: { Summary: 'Update records for example.dusk', Records: 'Set website; Clear avatar' },
      clear_record: { Summary: 'Update records for example.dusk', Records: 'Clear avatar' },
      set_primary: { Summary: 'Set example.dusk as your primary name' },
      clear_primary: { Summary: 'Clear example.dusk as your primary name' },
      create_subname: { Summary: 'Create pay.example.dusk', Subdomain: 'pay.example.dusk', 'Expiry (estimated)': '2026-10-09' },
      remove_subname: { Summary: 'Remove pay.example.dusk and all its descendants' },
      take_back_subnames: { Summary: 'Take back subnames of example.dusk', Subdomains: 'pay.example.dusk' },
      fixed: { Summary: 'List example.dusk for 10 DUSK', Price: '10 DUSK', Fee: '0.25 DUSK (2.5%)', Proceeds: '9.75 DUSK', 'Expiry (estimated)': '2026-10-08' },
      auction: { Summary: 'Auction example.dusk with a minimum bid of 10 DUSK', 'Minimum bid': '10 DUSK', Fee: '0.25 DUSK (2.5%) at minimum bid', Proceeds: '9.75 DUSK at minimum bid' },
      accept: { Summary: 'Accept the offer for example.dusk: 10 DUSK', Price: '10 DUSK', Fee: '0.25 DUSK (2.5%)', Proceeds: '9.75 DUSK' },
      buy: { Summary: 'Buy example.dusk for 10 DUSK', Price: '10 DUSK', Refund: 'No refund after a successful purchase' },
      bid: { Summary: 'Bid 11 DUSK on example.dusk', 'Held in escrow (refundable)': '11 DUSK' },
      offer: { Summary: 'Offer 10 DUSK for example.dusk', 'Held in escrow (refundable)': '10 DUSK', 'Expiry (estimated)': '2026-10-08' },
      cancel_fixed: { Summary: 'Cancel the listing for example.dusk', Price: '10 DUSK', Refund: '0 DUSK' },
      expire_fixed: { Summary: 'Close the expired listing for example.dusk', Price: '10 DUSK', Refund: '0 DUSK' },
      cancel_auction: { Summary: 'Cancel the auction for example.dusk', 'Minimum bid': '10 DUSK', Refund: '0 DUSK' },
      expire_auction: { Summary: 'Close the expired auction for example.dusk', 'Minimum bid': '10 DUSK', Refund: '0 DUSK' },
      cancel_offer: { Summary: 'Cancel the offer for example.dusk: refund 10 DUSK', Refund: '10 DUSK' },
      expire_offer: { Summary: 'Close the expired offer for example.dusk: refund 10 DUSK', Refund: '10 DUSK' },
      settle: { Summary: 'Settle the auction for example.dusk', 'Minimum bid': '10 DUSK' },
      return: { Summary: 'Return example.dusk from marketplace escrow', Refund: 'No additional refund; withdraw any available balance separately' },
      refund: { Summary: 'Withdraw 25 DUSK in marketplace refunds for all names', Refund: '25 DUSK', Names: 'All names in this marketplace' },
      protocol_exact: { Summary: 'Withdraw 0.000000123 DUSK from the Dusk Domains treasury', Withdrawal: '0.000000123 DUSK' },
      protocol_all: { Summary: 'Withdraw all treasury funds: currently 30 DUSK', Withdrawal: '30 DUSK' },
      referral_exact: { Summary: 'Claim 0.000000123 DUSK in Dusk Domains referral rewards', Rewards: '0.000000123 DUSK' },
      referral_all: { Summary: 'Claim all Dusk Domains referral rewards: currently 40 DUSK', Rewards: '40 DUSK' },
    }[action]
    expect(details).toMatchObject(expected)
    expect(Object.keys(details!)[0]).toBe('Summary')
    expect(details!['Network fee']).toBe('Paid separately; see wallet estimate')
    const text = JSON.stringify(details)
    expect(text).not.toMatch(/deposit|block|domain reference/i)
    expect(text).not.toContain(node.slice(2))
    expect(text).not.toContain(namehashHex('pay.example.dusk').slice(2))
  },
)

it.each(['matching', 'changed', 'missing', 'invalid'] as const)(
  'rechecks a %s recipient record through forwarded SDK resolution',
  async (state) => {
    const h = fixture()
    const reviewed = endpointBytes(account)
    const { handoff } = await import('../test/handoffFixtures')
    h.responses.set(`${id(7)}:resolve_record`, {
      Local:
        state === 'missing'
          ? null
          : {
              key: 'moonlight_address',
              value:
                state === 'changed' ? handoff.roles.payout : state === 'invalid' ? [1, 2] : reviewed,
              ttl_seconds: 60n,
              updated_at: 100n,
            },
    })
    const authority = '0x' + sdk.hex(sdk.authority({ kind: 'Moonlight', bytes: reviewed }))
    const request = {
      ...intent.storeUpdateAuthoritiesRequest({ node, owner: authority, manager: authority }),
      reviewedRecipient: { name: 'recipient.dusk', address: account, kind: 'transfer' as const },
    }
    const result = prepareFrozenCall(h.client, request, 'example.dusk', account)
    if (state === 'matching')
      await expect(result).resolves.toMatchObject({
        contractId: id(7),
        args: { owner: sdk.fromHex(authority), manager: sdk.fromHex(authority) },
      })
    else await expect(result).rejects.toThrow()
    expect(h.calls).toContainEqual({
      target: id(7),
      method: 'resolve_record',
      args: { key: sdk.nameKey('recipient.dusk'), record_key: 'moonlight_address' },
    })
  },
)

it('switches from settlement to close/return and allows the refund at the recorded marketplace', async () => {
  const h = fixture(),
    order = reviewedOrder(h, 'Auction')
  order.end = 200n
  h.setHeight(8839n)
  const settle = {
    ...intent.marketplaceSettleAuctionRequest({ node, expectedAuctionId: 12 }),
    contractId: id(6),
    reviewedOrder: order,
  }
  expect((await prepareFrozenCall(h.client, settle, 'example.dusk', account)).functionName).toBe(
    'settle_auction',
  )
  h.setHeight(8840n)
  await expect(prepareFrozenCall(h.client, settle, 'example.dusk', account)).rejects.toThrow(
    'settlement window closed',
  )
  const close = {
    ...intent.marketplaceExpireAuctionRequest({ node, expectedAuctionId: 12 }),
    contractId: id(6),
    reviewedOrder: order,
  }
  expect((await prepareFrozenCall(h.client, close, 'example.dusk', account)).functionName).toBe(
    'expire_order',
  )
  // Simulated contract readback after expiry. Neither return nor refund needs a live name.
  order.status = 'ReturnPending'
  h.responses.set(`${id(7)}:get_name`, 'Absent')
  h.directory.preferred_marketplace = null
  expect((await prepareFrozenCall(h.client, close, 'example.dusk', account)).functionName).toBe(
    'retry_return',
  )
  expect(
    await prepareFrozenCall(
      h.client,
      { ...intent.marketplaceClaimRefundRequest(), contractId: id(6) },
      'Marketplace refund',
      account,
    ),
  ).toMatchObject({ contractId: id(6), functionName: 'claim_refund' })
})

it.each(['Fixed', 'Auction', 'Offer'] as const)(
  'reads a %s from its original store and refuses a changed canonical identity',
  async (kind) => {
    const h = fixture(),
      order = reviewedOrder(h, kind)
    order.terms.store = bytes(3)
    const { createDuskDomainsMarketplaceOnChainClient } = await import('./reads')
    const client = createDuskDomainsMarketplaceOnChainClient({
      client: Promise.resolve(h.client),
      read: async () => {
        throw new Error('legacy read')
      },
    })
    const identity = {
      marketplaceContractId: id(6),
      name: 'example.dusk',
      order: structuredClone(order),
    }
    const read = () =>
      kind === 'Fixed'
        ? client.getFixedSale(node, identity)
        : kind === 'Auction'
          ? client.getAuction(node, identity)
          : client.getOffer(node, '0x' + id(9), identity)
    expect(await read()).toMatchObject({ ok: true, value: { order } })
    order.terms.store = bytes(7)
    expect(await read()).toMatchObject({ ok: false })
    expect(
      h.calls.some((c) => ['home', 'get_name', 'read_listing', 'read_offer'].includes(c.method)),
    ).toBe(false)
  },
)

it('refuses accepting an offer that still belongs to the original shard', async () => {
  const h = fixture(),
    order = reviewedOrder(h, 'Offer')
  order.terms.store = bytes(3)
  const request = {
    ...intent.storeAcceptMarketplaceOfferRequest({
      node,
      marketplaceContract: id(6),
      buyerAuthority: '0x' + id(9),
      expectedOfferId: 12,
      expectedFeeBps: 250,
      expectedAmountLux: 10e9,
      sellerRecipient: account,
    }),
    contractId: id(6),
    reviewedOrder: order,
  }
  await expect(prepareFrozenCall(h.client, request, 'example.dusk', account)).rejects.toThrow(
    'terms changed',
  )
})

it('reads refundable funds at the recorded market when the preferred market is absent', async () => {
  const h = fixture()
  h.directory.preferred_marketplace = null
  h.responses.set(`${id(6)}:read_refund`, { authority: h.name.name.owner, amount_lux: '123' })
  const { createDuskDomainsMarketplaceOnChainClient } = await import('./reads')
  const client = createDuskDomainsMarketplaceOnChainClient({
    client: Promise.resolve(h.client),
    read: async () => {
      throw new Error('legacy read')
    },
  })
  expect(await client.getRefund('0x' + sdk.hex(h.name.name.owner), id(6))).toMatchObject({
    ok: true,
    value: { amountLux: 123n },
  })
})


it.each([1, 2])('leads registration with the full name, %s-year term and actual price', async durationYears => {
  const h = fixture()
  h.quote.total_lux = '50000000000'
  h.quote.quote.base_lux = '50000000000'
  const saved = reservation({ name: 'maya.dusk', directory: id(1), commitmentStore: id(3) })
  const call = await prepareFrozenCall(h.client, intent.storeCompleteRegistrationRequest({
    directory: id(1), commitmentStore: id(3), commitment: saved.commitment, secret: saved.secret,
    node: namehashHex('maya.dusk'), label: 'maya', durationYears, feeLux: 50e9, records: [],
  }), 'maya.dusk', account)
  expect(call.display).toMatchObject({
    Summary: `Register maya.dusk for ${durationYears} ${durationYears === 1 ? 'year' : 'years'}: 50 DUSK`,
    Name: 'maya.dusk', Price: '50 DUSK', Records: 'None',
  })
})

it.each(['place_bid', 'expire_auction', 'settle_auction'] as const)('describes the current bid money for %s', async functionName => {
  const h = fixture()
  const order = reviewedOrder(h, 'Auction')
  order.highest = { payer: { kind: 'Moonlight', bytes: endpointBytes(account) }, manager: h.name.name.manager, amount_lux: '20000000000' }
  order.end = 200n
  order.started_at = 100n
  order.maximum_end = 300n
  const call = await prepareFrozenCall(h.client, {
    contract: 'marketplace', functionName, kind: 'write', contractId: id(6), reviewedOrder: order,
    args: { node, expectedAuctionId: 12, amountLux: 22e9 },
  }, 'example.dusk', account)
  if (functionName === 'place_bid') {
    expect(call.display).toMatchObject({ 'Held in escrow (refundable)': '22 DUSK', 'Previous bid': '20 DUSK' })
    expect(call.display?.Refund).toContain('raising your own bid')
    expect(call.display?.['Auction end (estimated)']).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  } else if (functionName === 'expire_auction') {
    expect(call.display).toMatchObject({ Summary: 'Close the expired auction for example.dusk: refund 20 DUSK', Refund: '20 DUSK' })
    expect(call.display?.['Refund availability']).toContain('bidder withdraws separately')
  } else {
    expect(call.display).toMatchObject({ Price: '20 DUSK', Fee: '0.5 DUSK (2.5%)', Proceeds: '19.5 DUSK' })
  }
})

it('names the primary mapping being cleared even when a different name page requested it', async () => {
  const h = fixture()
  h.responses.set(`${id(3)}:read_primary`, {
    spelling: 'actual.dusk', primary: { endpoint: endpointBytes(account),
      name: { key: sdk.nameKey('actual.dusk'), incarnation: h.name.name.incarnation }, mapping_id: 42n, updated_at: 100n },
  })
  const call = await prepareFrozenCall(h.client, intent.storeClearPrimaryNameRequest({
    endpointType: 'moonlight_address', endpointValue: account,
  }), 'example.dusk', account)
  expect(call.display).toMatchObject({ Summary: 'Clear actual.dusk as your primary name', Name: 'actual.dusk' })
  expect(JSON.stringify(call.display)).not.toContain('example.dusk')
})
