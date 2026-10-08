import { readFileSync } from 'node:fs'
import * as sdk from '@duskdomains/sdk'
import { submitDuskDomainWrite } from '../names/transactions'
import { userFacingTxMessage } from '../components/status/txStatus'
import { account } from '../test/frozenFixtures'
import { endpointBytes } from '../names/reads'
import { config, contracts } from '../test/frozenFixtures'
import { createClientFromManifest, storeCommitCall } from '@duskdomains/sdk'
vi.mock('@duskdomains/sdk', async original => ({...await original<typeof import('@duskdomains/sdk')>(),createClientFromManifest:vi.fn()}))
import { afterEach, expect, it, vi } from 'vitest'
import { announceDuskProvider, DuskWallet, type DuskProvider } from '@dusk/connect'
import { type DuskDomainsRuntimeConfig } from '../names/internal'
import { createWalletSession } from '../features/wallet/walletSession'
import { createDuskDomainsLiveApp } from './duskDomainsLiveApp'

const cleanups: Array<() => void> = []
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); vi.unstubAllGlobals() })

const samples = sdk.parseJson(readFileSync('src/test/frozen-wire.json', 'utf8')) as Record<string, unknown>
const order = sdk.wireValue('Order', samples.Order)
const record = sdk.createRecordInput('website', 'https://example.test')
const registration = (referrer: sdk.TypedPrincipal | null) => sdk.storeRegisterCall(contracts.store.contractId, {
  node: sdk.nameKey('example.dusk').node, label: 'example', years: 1,
  commitment: Array(32).fill(1), secret: Array(32).fill(2), commitment_store: sdk.fromHex(contracts.store.contractId, 32),
  expected_fee_lux: '10000000000', expected_policy_version: 1n, expected_policy_config_version: 1n,
  valid_until: 100n, referrer, records: [record], primary: null,
})
const withoutReferrer = registration(null)
const firstTimeReferrer = registration({ kind: 'Moonlight', bytes: endpointBytes(account) })
const balanceCases = [
  { label: 'reservation', intent: 'commit', action: 'reserving this name', call: storeCommitCall(contracts.store.contractId, { hash: Array(32).fill(1) }) },
  { label: 'registration without referrer', intent: 'complete_registration', action: 'registering this name', call: withoutReferrer },
  { label: 'registration with first-time referrer', intent: 'complete_registration', action: 'registering this name', call: firstTimeReferrer },
  { label: 'buy', intent: 'buy_fixed_sale', action: 'buying this name', call: sdk.marketplaceBuyFixedCall(contracts.marketplace!.contractId, {
    order: { ...order, terms: { ...order.terms, amount_lux: '10000000000', referral: null } }, manager: Array(32).fill(1), valid_until: 100n,
  }) },
  { label: 'bid', intent: 'place_bid', action: 'placing this bid', call: sdk.marketplacePlaceBidCall(contracts.marketplace!.contractId, {
    order: { ...order, terms: { ...order.terms, kind: 'Auction', amount_lux: '10000000000' } }, amount_lux: '20000000000', manager: Array(32).fill(1), valid_until: 100n,
  }) },
  { label: 'record edit', intent: 'mutate_records_sender', action: 'saving these records', call: sdk.storeMutateRecordsCall(contracts.store.contractId, {
    name: order.terms.name, mutations: [{ action: 'Set', ...record }],
  }) },
  { label: 'large record batch', intent: 'mutate_records_sender', action: 'saving these records', call: sdk.storeMutateRecordsCall(contracts.store.contractId, {
    name: order.terms.name, mutations: Array.from({ length: 8 }, (_, i) => ({ action: 'Set', ...sdk.createRecordInput(`text.k${i}`, 'a'.repeat(505)) })),
  }) },
  { label: 'referral claim', intent: 'claim_all_referral_rewards', action: 'claiming referral rewards', call: sdk.vaultClaimReferralCall(contracts.vault.contractId, { amount: 'All', recipient: endpointBytes(account) }) },
  { label: 'treasury claim', intent: 'claim_all', action: 'claiming treasury funds', call: sdk.vaultClaimProtocolCall(contracts.vault.contractId, { amount: 'All', expected_operator_epoch: 1n }) },
  { label: 'refund claim', intent: 'claim_refund', action: 'withdrawing your refund', call: sdk.marketplaceClaimRefundCall(contracts.marketplace!.contractId, { amount: 'All', recipient: endpointBytes(account) }) },
]

it('uses distinct input-aware limits for registration and record edits', () => {
  expect(firstTimeReferrer.gasLimit).toBeGreaterThan(withoutReferrer.gasLimit)
  expect(balanceCases.find(c => c.label === 'large record batch')!.call.gasLimit).toBeGreaterThan(balanceCases.find(c => c.label === 'record edit')!.call.gasLimit)
})

for (const price of [1n, 7n]) {
  for (const shortBy of [0n, 1n]) {
    it.each(balanceCases)(`checks $label at price ${price}, short by ${shortBy} Lux before opening the wallet`, async ({ call, intent, action }) => {
      const { provider, names } = await fixture()
      const required = BigInt(call.deposit) + call.gasLimit * price
      const available = required - shortBy
      const request = provider.request.getMockImplementation()!
      provider.request.mockImplementation(args => args.method === 'dusk_estimateGas'
        ? Promise.resolve({ median: price.toString() })
        : args.method === 'dusk_getPublicBalance' ? Promise.resolve({ value: available.toString() }) : request(args))
      const onUpdate = vi.fn()
      const state = await submitDuskDomainWrite({ ...names, prepareIntent: async () => call }, {
        contract: call.role, functionName: intent, kind: 'write', args: {},
      }, { name: 'example.dusk', contracts, balanceAction: action, onUpdate })
      const sends = provider.request.mock.calls.filter(([args]) => args.method === 'dusk_sendTransaction')
      if (shortBy) {
        expect(state.status).toBe('failed')
        expect(sends).toHaveLength(0)
        expect(onUpdate.mock.calls.some(([s]) => s.status === 'awaiting_approval')).toBe(false)
        const message = `Insufficient public DUSK for ${action}. Available: ${sdk.formatLuxAsDusk(available)}. Required: ${sdk.formatLuxAsDusk(required)}.`
        expect(state.message).toBe(message)
        expect(userFacingTxMessage(state)).toBe(message)
      } else {
        expect(state.status).toBe('submitted')
        expect(sends).toHaveLength(1)
        expect(sends[0][0]).toMatchObject({ params: { deposit: call.deposit, gas: { limit: call.gasLimit.toString(), price: price.toString() } } })
      }
    })
  }
}

it('keeps the prepared gas price even if the next estimate would increase', async () => {
  const { provider, names } = await fixture()
  const call = withoutReferrer
  let estimates = 0
  const request = provider.request.getMockImplementation()!
  provider.request.mockImplementation(args => args.method === 'dusk_estimateGas'
    ? Promise.resolve({ median: ++estimates === 1 ? '3' : '10' })
    : args.method === 'dusk_getPublicBalance' ? Promise.resolve({ value: (BigInt(call.deposit) + call.gasLimit * 3n).toString() }) : request(args))
  const state = await submitDuskDomainWrite({ ...names, prepareIntent: async () => call }, {
    contract: 'store', functionName: 'complete_registration', kind: 'write', args: {},
  }, { name: 'example.dusk', contracts })
  expect(state.status).toBe('submitted')
  expect(estimates).toBe(1)
  expect(provider.request).toHaveBeenCalledWith(expect.objectContaining({ method: 'dusk_sendTransaction', params: expect.objectContaining({ gas: { limit: call.gasLimit.toString(), price: '3' } }) }))
})

it('preserves exact feedback if funds fall between preparation and submission', async () => {
  const { provider, names } = await fixture()
  const call = withoutReferrer
  const required = BigInt(call.deposit) + call.gasLimit
  let balances = 0
  const request = provider.request.getMockImplementation()!
  provider.request.mockImplementation(args => args.method === 'dusk_getPublicBalance'
    ? Promise.resolve({ value: (required - (++balances === 1 ? 0n : 1n)).toString() }) : request(args))
  const state = await submitDuskDomainWrite({ ...names, prepareIntent: async () => call }, {
    contract: 'store', functionName: 'complete_registration', kind: 'write', args: {},
  }, { name: 'example.dusk', contracts })
  expect(state.status).toBe('failed')
  expect(state.message).toBe(`Insufficient public DUSK for registering this name. Available: ${sdk.formatLuxAsDusk(required - 1n)}. Required: ${sdk.formatLuxAsDusk(required)}.`)
  expect(provider.request.mock.calls.some(([args]) => args.method === 'dusk_sendTransaction')).toBe(false)
})

it.each([null, {}, { value: 'bad' }, { value: '-1' }, { value: '1.5' }])('blocks unreadable public balance %j before approval', async balance => {
  const { provider, names } = await fixture()
  const request = provider.request.getMockImplementation()!
  provider.request.mockImplementation(args => args.method === 'dusk_getPublicBalance'
    ? Promise.resolve(balance) : request(args))
  const onUpdate = vi.fn()
  const state = await submitDuskDomainWrite({ ...names, prepareIntent: async () => withoutReferrer }, {
    contract: 'store', functionName: 'complete_registration', kind: 'write', args: {},
  }, { name: 'example.dusk', contracts, onUpdate })
  expect(state).toMatchObject({ status: 'failed', message: 'Could not read the wallet public balance.' })
  expect(onUpdate.mock.calls.some(([s]) => s.status === 'awaiting_approval')).toBe(false)
  expect(provider.request.mock.calls.some(([args]) => args.method === 'dusk_sendTransaction')).toBe(false)
})

async function fixture(chainId = 'dusk:2') {
  vi.stubGlobal('window', new EventTarget())
  const release = {manifest:{chainId},contracts:new Map(Object.entries(contracts).map(([role,c])=>[c.contractId,{role}])),drivers:new Map(Object.values(contracts).map(c=>[c.contractId,{encodeInput:()=>new Uint8Array([1,2,3])}]))}
  vi.mocked(createClientFromManifest).mockResolvedValue({release} as never)
  const listeners = new Map<string, Set<(value: unknown) => void>>()
  const provider = {
    isDusk: true, isAuthorized: true, chainId, profiles: [{ account: 'A', profileId: 'primary' }],
    on(event: string, callback: (value: unknown) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(callback)
    },
    off(event: string, callback: (value: unknown) => void) { listeners.get(event)?.delete(callback) },
    request: vi.fn(async ({ method }: { method: string }): Promise<unknown> => {
      if (method === 'dusk_getPublicBalance') return {value:'1000000000000000'}
      if (method === 'dusk_estimateGas') return {median:'1'}
      if (method === 'dusk_profiles') return provider.profiles
      if (method === 'dusk_chainId') return provider.chainId
      if (method === 'dusk_disconnect') throw new Error('Revocation unavailable')
      if (method === 'dusk_sendTransaction') return { hash: 'ab'.repeat(32), nonce: '1' }
      return null
    }),
  }
  const info = { uuid: 'wallet', name: 'Wallet', rdns: 'test.wallet', icon: '' }
  const base = new DuskWallet({ provider: provider as unknown as DuskProvider, providerInfo: info, autoRefresh: false, rememberLastUsedProvider: false })
  const session = createWalletSession(base)
  cleanups.push(session.destroy)
  const emit = (event: string, value?: unknown) => listeners.get(event)?.forEach(callback => callback(value))
  emit('duskNodeChanged', { chainId, nodeUrl: 'http://127.0.0.1:18181/' })
  await session.ready()
  await session.refresh()
  const runtimeConfig = { ...config, chainId, nodeUrl: 'http://127.0.0.1:18181/' } as DuskDomainsRuntimeConfig
  const { names } = createDuskDomainsLiveApp({ runtimeConfig, wallet: base, session, autoConnect: false })
  const write = () => names.writeContract({ contract: contracts.store, functionName: 'commit', args: storeCommitCall(contracts.store.contractId,{hash:Array(32).fill(1)}) })
  provider.request.mockClear()
  return { provider, session, emit, write, info, names, release }
}

it('keeps the wallet chain live through the app wrapper', async () => {
  const { names, provider, emit } = await fixture()
  expect(names.chainId).toBe('dusk:2')
  provider.chainId = 'dusk:1'
  emit('chainChanged', provider.chainId)
  expect(names.chainId).toBe('dusk:1')
})

it.each(['dusk:0', 'dusk:2'])('sends an unchanged %s session through installed connect and its data driver', async chain => {
  const { provider, write } = await fixture(chain)
  await expect(write()).resolves.toMatchObject({ hash: 'ab'.repeat(32) })
  const sends = provider.request.mock.calls.filter(([args]) => args.method === 'dusk_sendTransaction')
  expect(sends).toHaveLength(1)
  expect(sends[0][0]).toMatchObject({ params: { kind: 'contract_call', fnName: 'commit', fnArgs: expect.any(String) } })
  expect(provider.request.mock.calls.some(([args]) => args.method === 'dusk_switchNetwork')).toBe(false)
})

it.each([
  ['7', '7'],
  ['2000', '10'],
  ['18446744073709551616', '1'],
  [Number.MAX_SAFE_INTEGER + 1, '1'],
] as const)('passes a complete gas object through installed connect using wallet median %s', async (median, price) => {
  const { provider, write } = await fixture()
  const request = provider.request.getMockImplementation()!
  provider.request.mockImplementation(args => args.method === 'dusk_estimateGas'
    ? Promise.resolve({ average: '8', max: '20', median, min: '2' })
    : request(args))
  await write()
  expect(provider.request).toHaveBeenCalledWith({ method: 'dusk_estimateGas', params: {} })
  expect(provider.request).toHaveBeenCalledWith(expect.objectContaining({ method: 'dusk_sendTransaction', params: expect.objectContaining({ gas: { limit: storeCommitCall(contracts.store.contractId,{hash:Array(32).fill(1)}).gasLimit.toString(), price } }) }))
})

it.each(['lock', 'disconnect', 'network', 'account', 'profile', 'authorization', 'node', 'encoding', 'announcement'])('refuses %s during installed connect preparation at the provider boundary', async change => {
  const { provider, session, emit, write, info, release } = await fixture(change === 'node' ? 'dusk:0' : 'dusk:2')
  const delayed = Promise.withResolvers<unknown>()
  const request = provider.request.getMockImplementation()!
  let waiting = false
  if (change === 'encoding') vi.mocked(createClientFromManifest).mockImplementationOnce(() => { waiting = true; return delayed.promise as never })
  else provider.request.mockImplementation(args => {
    // Network: delay the second chain read, after ensureChain's refresh.
    if (!waiting && args.method === 'dusk_estimateGas') {
      waiting = true
      return delayed.promise
    }
    return request(args)
  })
  const result = expect(write()).rejects.toThrow(change === 'network' ? 'Wallet must be connected' : 'wallet session changed')
  await vi.waitFor(() => expect(waiting).toBe(true))
  if (change === 'disconnect') await expect(session.disconnect()).rejects.toThrow('Revocation unavailable')
  else if (change === 'network') { provider.chainId = 'dusk:1'; emit('chainChanged', provider.chainId) }
  else if (change === 'node') emit('duskNodeChanged', { chainId: 'dusk:0', nodeUrl: 'http://localhost:18181/' })
  else if (change === 'authorization') { provider.isAuthorized = false; emit('disconnect') }
  else {
    if (change === 'announcement') announceDuskProvider({ provider: provider as unknown as DuskProvider, info })
    provider.profiles = change === 'account' ? [{ account: 'B', profileId: 'primary' }]
      : change === 'profile' ? [{ account: 'A', profileId: 'other' }] : []
    emit(change === 'lock' ? 'lock' : 'profilesChanged', provider.profiles)
  }
  await session.refresh()
  if (change === 'encoding') delayed.resolve({release})
  else delayed.resolve({median:'1'})
  await result
  expect(provider.request.mock.calls.filter(([args]) => args.method === 'dusk_sendTransaction')).toEqual([])
})

it.each(['profiles', 'encoding'])('rejects a return to the same account during installed connect %s preparation', async stage => {
  const { provider, session, emit, write, release } = await fixture()
  const delayed = Promise.withResolvers<unknown>()
  const request = provider.request.getMockImplementation()!
  let waiting = false
  if (stage === 'encoding') vi.mocked(createClientFromManifest).mockImplementationOnce(() => { waiting = true; return delayed.promise as never })
  else provider.request.mockImplementation(args => {
    if (!waiting && args.method === 'dusk_estimateGas') { waiting = true; return delayed.promise }
    return request(args)
  })
  const outcome = write().then(() => 'sent', error => error.message)
  await vi.waitFor(() => expect(waiting).toBe(true))
  for (const account of ['B', 'A']) {
    provider.profiles = [{ account, profileId: 'primary' }]
    emit('profilesChanged', provider.profiles)
    await session.refresh()
  }
  delayed.resolve(stage === 'encoding' ? {release} : {median:'1'})
  expect(await outcome).toContain('wallet session changed')
  expect(provider.request.mock.calls.filter(([args]) => args.method === 'dusk_sendTransaction')).toEqual([])
})


it.each(balanceCases)('replaces only site details for $label at the provider boundary', async ({ call, intent }) => {
  const { provider, names } = await fixture()
  const request = { contract: call.role, functionName: intent, kind: 'write' as const, args: {} }
  const submit = (display?: Record<string, string>) => submitDuskDomainWrite({ ...names, prepareIntent: async () => ({ ...call, display }) }, request, { name: 'example.dusk', contracts })
  await submit()
  const original = provider.request.mock.calls.find(([args]) => args.method === 'dusk_sendTransaction')![0]
  provider.request.mockClear()
  const display = { Summary: 'Update example.dusk', Name: 'example.dusk', Price: '10 DUSK' }
  await submit(display)
  const sent = provider.request.mock.calls.find(([args]) => args.method === 'dusk_sendTransaction')![0]
  expect(sent).toEqual({ ...original, params: { ...(original as { params: object }).params, display } })
})
