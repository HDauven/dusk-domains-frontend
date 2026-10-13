import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { PrimaryElsewhereError } from '../../names/primaryLinks'
import { PrimaryNameControl } from './PrimaryNameControl'
import { setPrimaryDomainName, switchPrimaryDomainName, type PrimarySwitch } from './setPrimaryDomainName'

const account = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'
// Noah's primary name is in the first store; revfixproof.dusk lives in the second.
const first = 'a1'.repeat(32), second = 'b2'.repeat(32)
const current = { store: first, name: 'noahcandidate.dusk', node: '0x01', mappingId: '6', updatedAtBlock: 84631 }
const targetRef = { key: { root: [2], node: [2] }, incarnation: { generation: 1n, serial: 1n } }

type Outcome = (call: { functionName: string }) => Record<string, unknown>
type Check = { ok: true; value: unknown } | { ok: false; error: { code: string; message: string } }
// What the chain says of revfixproof.dusk for the connected wallet: every set_primary precondition
// but uniqueness passes, and these are the address's links.
const passes = (links: Array<typeof current> = [current], ref = targetRef): Check => ({ ok: true, value: { store: second, nameRef: ref, links } })
const refuses = (message: string): Check => ({ ok: false, error: { code: 'not_primary_eligible', message } })

function setup({ checks = [passes()] as Check[], outcomes = [] as Outcome[] } = {}) {
  let primarySwitch: PrimarySwitch | null = null
  const setPrimarySwitch = vi.fn((next: PrimarySwitch | null | ((value: PrimarySwitch | null) => PrimarySwitch | null)) => {
    primarySwitch = typeof next === 'function' ? next(primarySwitch) : next
  })
  const submitNameWrite = Object.assign(vi.fn(async (_name: string, call: { functionName: string }) =>
    outcomes.shift()?.(call) ?? { status: 'executed', txId: `${call.functionName}-tx` }), { captureWorkspace: () => () => true })
  // Each read returns the next answer; the last one repeats.
  const chain = { checkPrimaryTarget: vi.fn(async () => (checks.length > 1 ? checks.shift() : checks[0])!) }
  const props = {
    canSetPrimary: true, walletSetupState: 'connected', displayName: 'revfixproof.dusk', nodeHex: '0x02',
    primaryEndpoint: account, selectedAddress: account, selectedAuthority: '0x03', runtimeConfig: { contracts: {} },
    moonlightRecord: { key: 'moonlight_address', value: account, visibility: 'public', ttlSeconds: 60, updatedAt: '' },
    duskDomainsOnChainClient: chain, primarySwitch: null,
    setPrimaryError: vi.fn(), setPrimaryTxState: vi.fn(), setPrimaryName: vi.fn(), setConnectedPrimaryName: vi.fn(),
    setPrimaryEndpointValue: vi.fn(), setPrimarySwitch, appendActivity: vi.fn(), submitNameWrite,
    // No indexer confirms the change here, so the page applies it itself.
    shouldApplyPreviewWriteFallback: vi.fn(async () => true),
    ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
  }
  return { props, submitNameWrite, chain, primarySwitch: () => primarySwitch }
}
const calls = (submit: ReturnType<typeof setup>['submitNameWrite']) => submit.mock.calls.map(([, call]) => call)
const review: PrimarySwitch = { endpoint: account, current: 'noahcandidate.dusk', store: first, mappingId: '6', target: 'revfixproof.dusk', targetRef, step: 'review' }

it('offers two approvals instead of a set_primary the chain would refuse, when the primary name is in another store', async () => {
  const h = setup()
  await setPrimaryDomainName(h.props as never)
  expect(h.chain.checkPrimaryTarget).toHaveBeenCalledWith('revfixproof.dusk', account)
  expect(h.submitNameWrite).not.toHaveBeenCalled()
  expect(h.primarySwitch()).toEqual(review)
})

it('refuses the manager’s own wallet when the name points to the owner’s address, and asks the wallet nothing', async () => {
  // Sam manages Noah's revfixproof.dusk, whose Dusk address record is Noah's.
  const reason = 'revfixproof.dusk points to another Dusk address, uhzF6xVjhA...UqG74t. Only that address’s wallet can make revfixproof.dusk its primary name.'
  const h = setup({ checks: [refuses(reason)] })
  await setPrimaryDomainName({ ...h.props, selectedAddress: 'sam-address', primaryEndpoint: 'sam-address' } as never)
  expect(h.chain.checkPrimaryTarget).toHaveBeenCalledWith('revfixproof.dusk', 'sam-address')
  expect(h.submitNameWrite).not.toHaveBeenCalled()
  expect(h.primarySwitch()).toBeNull()
  expect(h.props.setPrimaryError).toHaveBeenLastCalledWith(reason)
})

it('sends nothing when the chain can’t be read to check the name', async () => {
  const h = setup({ checks: [{ ok: false, error: { code: 'contract_read_failed', message: 'Node unavailable' } }] })
  await setPrimaryDomainName(h.props as never)
  expect(h.submitNameWrite).not.toHaveBeenCalled()
  expect(h.props.setPrimaryError).toHaveBeenLastCalledWith('Couldn’t check revfixproof.dusk on chain right now, so nothing was sent. Try again.')
})

it('clears the current primary name in its own store, then sets the new one once that is confirmed', async () => {
  const h = setup({ checks: [passes(), passes([])] })
  await switchPrimaryDomainName({ ...h.props, primarySwitch: review } as never)
  expect(calls(h.submitNameWrite)).toEqual([
    expect.objectContaining({ functionName: 'clear_primary_name', args: { endpointType: 'moonlight_address', endpointValue: account },
      reviewedPrimary: { name: 'noahcandidate.dusk', store: first, mappingId: '6' } }),
    // Bound to the name reviewed: preparation refuses another incarnation.
    expect.objectContaining({ functionName: 'set_primary_name', nameRef: targetRef,
      args: expect.objectContaining({ endpointValue: account, name: 'revfixproof.dusk' }) }),
  ])
  expect(h.primarySwitch()).toBeNull()
  expect(h.props.setConnectedPrimaryName.mock.calls).toEqual([[null], ['revfixproof.dusk']])
  expect(h.props.appendActivity).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ eventType: 'primary_name_set' }))
})

it('refuses a forward record that no longer matches before the first approval', async () => {
  const reason = 'revfixproof.dusk points to another Dusk address, oU2ADz9QGb...x5a6y2. Only that address’s wallet can make revfixproof.dusk its primary name.'
  const h = setup({ checks: [refuses(reason)] })
  await switchPrimaryDomainName({ ...h.props, primarySwitch: review } as never)
  expect(h.submitNameWrite).not.toHaveBeenCalled()
  expect(h.primarySwitch()).toBeNull()
  expect(h.props.setPrimaryError).toHaveBeenLastCalledWith(reason)
})

it('refuses a mapping that changed since the review instead of clearing the new one', async () => {
  // The same name's link was set again: another mapping ID.
  const h = setup({ checks: [passes([{ ...current, mappingId: '7' }])] })
  await switchPrimaryDomainName({ ...h.props, primarySwitch: review } as never)
  expect(h.submitNameWrite).not.toHaveBeenCalled()
  expect(h.primarySwitch()).toEqual({ ...review, mappingId: '7' })
  expect(h.props.setPrimaryError).toHaveBeenLastCalledWith('Your primary name changed since you reviewed it. Check it again before continuing.')
})

it.each([
  ['the name expired', refuses('revfixproof.dusk has expired, so it can’t be a primary name. Renew it first.'),
    'noahcandidate.dusk is no longer your primary name, and revfixproof.dusk wasn’t set. revfixproof.dusk has expired, so it can’t be a primary name. Renew it first.'],
  ['the name was registered again', passes([], { ...targetRef, incarnation: { generation: 2n, serial: 1n } }),
    'noahcandidate.dusk is no longer your primary name, and revfixproof.dusk wasn’t set. revfixproof.dusk changed since you reviewed it. Turn Primary name on again to check it.'],
] as const)('checks every precondition again before the second approval, and refuses when %s', async (_, after, copy) => {
  const h = setup({ checks: [passes(), after] })
  await switchPrimaryDomainName({ ...h.props, primarySwitch: review } as never)
  expect(calls(h.submitNameWrite).map(call => call.functionName)).toEqual(['clear_primary_name'])
  expect(h.primarySwitch()).toBeNull()
  expect(h.props.setConnectedPrimaryName).toHaveBeenLastCalledWith(null)
  expect(h.props.setPrimaryError).toHaveBeenLastCalledWith(copy)
})

it('says what the chain refused when the second approval doesn’t go through', async () => {
  const forward = 'This name’s Dusk address record isn’t this wallet’s address, so it can’t be this wallet’s primary name.'
  const h = setup({ checks: [passes(), passes([])], outcomes: [() => ({ status: 'executed', txId: 'clear-tx' }), () => ({ status: 'failed', txId: 'set-tx', message: forward })] })
  await switchPrimaryDomainName({ ...h.props, primarySwitch: review } as never)
  expect(calls(h.submitNameWrite).map(call => call.functionName)).toEqual(['clear_primary_name', 'set_primary_name'])
  expect(h.props.setPrimaryError).toHaveBeenLastCalledWith(`noahcandidate.dusk is no longer your primary name, and revfixproof.dusk wasn’t set. ${forward}`)
})

it('reads the chain’s refusal from the receipt when the wallet passes it on as bytes', async () => {
  const receipt = { hash: 'set-tx', status: 'executed', ok: true, event: { headers: { 'content-type': 'application/octet-stream' },
    payload: new TextEncoder().encode(JSON.stringify({ err: 'Panic { msg: "DuskDS:v1:ForwardMismatch" }', gas_spent: 3_200_000 })) } }
  const h = setup({ checks: [passes(), passes([])], outcomes: [() => ({ status: 'executed', txId: 'clear-tx' }), () => ({ status: 'failed', txId: 'set-tx', result: receipt })] })
  await switchPrimaryDomainName({ ...h.props, primarySwitch: review } as never)
  expect(h.props.setPrimaryError).toHaveBeenLastCalledWith('noahcandidate.dusk is no longer your primary name, and revfixproof.dusk wasn’t set. This name’s Dusk address record isn’t this wallet’s address, so it can’t be this wallet’s primary name.')
})

it('names the chain’s refusal of a one-approval set too, read from the receipt', async () => {
  const receipt = { hash: 'set-tx', status: 'executed', ok: true, event: { headers: { 'content-type': 'application/octet-stream' },
    payload: new TextEncoder().encode(JSON.stringify({ err: 'Panic { msg: "DuskDS:v1:Expired" }', gas_spent: 3_200_000 })) } }
  const h = setup({ checks: [passes([])], outcomes: [() => ({ status: 'failed', txId: 'set-tx', result: receipt })] })
  await setPrimaryDomainName(h.props as never)
  expect(h.props.setPrimaryError).toHaveBeenLastCalledWith('This name has expired, so it can’t be a primary name. Renew it first.')
})

it('names the chain’s refusal of the first approval, which leaves the primary name as it was', async () => {
  const h = setup({ outcomes: [() => ({ status: 'failed', txId: 'clear-tx', message: 'Panic: DuskDS:v1:Stale' })] })
  await switchPrimaryDomainName({ ...h.props, primarySwitch: review } as never)
  expect(calls(h.submitNameWrite).map(call => call.functionName)).toEqual(['clear_primary_name'])
  expect(h.props.setPrimaryError).toHaveBeenLastCalledWith('noahcandidate.dusk is still your primary name, so revfixproof.dusk wasn’t set. Your primary name changed since you reviewed it. Check it again before continuing.')
})

it('asks for the second approval only after the first one is confirmed', async () => {
  const h = setup({ outcomes: [() => ({ status: 'rejected' })] })
  await switchPrimaryDomainName({ ...h.props, primarySwitch: review } as never)
  expect(calls(h.submitNameWrite).map(call => call.functionName)).toEqual(['clear_primary_name'])
  expect(h.primarySwitch()).toBeNull()
  expect(h.props.setPrimaryError).toHaveBeenLastCalledWith('Nothing changed: noahcandidate.dusk is still your primary name.')
})

it('says the old primary name is cleared when the second approval is rejected', async () => {
  const h = setup({ checks: [passes(), passes([])], outcomes: [() => ({ status: 'executed', txId: 'clear-tx' }), () => ({ status: 'rejected' })] })
  await switchPrimaryDomainName({ ...h.props, primarySwitch: review } as never)
  expect(calls(h.submitNameWrite).map(call => call.functionName)).toEqual(['clear_primary_name', 'set_primary_name'])
  expect(h.props.setConnectedPrimaryName).toHaveBeenLastCalledWith(null)
  expect(h.props.setPrimaryError).toHaveBeenLastCalledWith('noahcandidate.dusk is no longer your primary name, and revfixproof.dusk wasn’t set. The wallet request was rejected. Turn Primary name on again to set it.')
})

it('sends nothing and says why when the current primary name can’t be cleared now', async () => {
  const reason = 'noahcandidate.dusk is moving between shards, so it can’t be cleared as your primary name until the move finishes. Try again after it.'
  // Preparation refused the clear: no transaction exists.
  const h = setup({ outcomes: [() => ({ status: 'failed', message: reason, error: new Error(reason) })] })
  await switchPrimaryDomainName({ ...h.props, primarySwitch: review } as never)
  expect(calls(h.submitNameWrite).map(call => call.functionName)).toEqual(['clear_primary_name'])
  expect(h.primarySwitch()).toBeNull()
  expect(h.props.setPrimaryTxState).toHaveBeenLastCalledWith(null)
  expect(h.props.setPrimaryError).toHaveBeenLastCalledWith(reason)
})

it('goes straight to the second approval when the old link is gone by the time the first is asked for', async () => {
  const h = setup({ checks: [passes([])] })
  await switchPrimaryDomainName({ ...h.props, primarySwitch: review } as never)
  expect(calls(h.submitNameWrite).map(call => call.functionName)).toEqual(['set_primary_name'])
})

it.each([
  ['in the same store', passes([{ ...current, store: second }])],
  ['when the Dusk address has none', passes([])],
] as const)('sets a primary name in one approval %s, bound to the name read', async (_, check) => {
  const h = setup({ checks: [check] })
  await setPrimaryDomainName(h.props as never)
  expect(calls(h.submitNameWrite)).toEqual([expect.objectContaining({ functionName: 'set_primary_name', nameRef: targetRef })])
  expect(h.primarySwitch()).toBeNull()
})

it('offers the two approvals when preparation finds the primary name in another store after all', async () => {
  // The read before was a block old: preparation reads every store again and sends nothing.
  const error = new PrimaryElsewhereError({ store: first, view: { spelling: 'noahcandidate.dusk', primary: { mapping_id: 6n } } } as never, 'revfixproof.dusk')
  const h = setup({ checks: [passes([])], outcomes: [() => ({ status: 'failed', message: error.message, error })] })
  await setPrimaryDomainName(h.props as never)
  expect(h.primarySwitch()).toEqual(review)
  expect(h.props.setPrimaryTxState).toHaveBeenLastCalledWith(null)
})

it('names both names and the two approvals, and holds the switch until they are done', () => {
  const render = (primarySwitch: PrimarySwitch) => renderToStaticMarkup(<PrimaryNameControl canSetPrimary canClearPrimary={false}
    displayName="revfixproof.dusk" error="" txState={null} primaryVerification={{ verified: false }} primarySwitch={primarySwitch}
    onSetPrimary={vi.fn()} onClearPrimary={vi.fn()} onConfirmPrimarySwitch={vi.fn()} onCancelPrimarySwitch={vi.fn()} />)
  const html = render(review)
  expect(html).toContain('noahcandidate.dusk is your primary name now, kept in a different shard from revfixproof.dusk.')
  expect(html).toContain('Making revfixproof.dusk your primary name takes two wallet approvals: the first clears noahcandidate.dusk as your primary name, the second sets revfixproof.dusk.')
  expect(html).toContain('>Clear noahcandidate.dusk and continue</button>')
  expect(html).toContain('>Cancel</button>')
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*role="switch"/)
  expect(render({ ...review, step: 'clearing' })).toContain('Approval 1 of 2: clearing noahcandidate.dusk as your primary name.')
  expect(render({ ...review, step: 'setting' })).toContain('Approval 2 of 2: setting revfixproof.dusk as your primary name.')
})
