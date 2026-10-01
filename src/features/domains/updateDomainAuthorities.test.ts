import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { useIndexerWriteFallback } from '../../app/useIndexerWriteFallback'
import { encodeBase58 } from '../../names/internal'
import { resolveRecipient } from '../identity/resolveRecipient'
import { updateDomainAuthorities } from './updateDomainAuthorities'
const address = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'
const otherAddress = '244Sywxj7PuMHpcPxemaXLcrY5rPgztra6H9Vz8cU1Ro5v23SxKTfVqr2yS7NXAXE1iq59ndn4aMZmYxuzu3Te3e9fokQKTUkYvFxYg2P2E8EEg1gWUbs3AFL2aNx62HQd7r'
const verified = { canonicalName: 'alice.dusk', verificationStatus: 'forward_resolved', errors: [], expiry: { status: 'active', expiresAt: '2099-01-01T00:00:00Z' }, resolver: { health: 'ok' }, cache: { staleAt: '2099-01-01T00:00:00Z' } }
const getHealth = async () => ({ ok: true }) as never
const owner = `0x${'ab'.repeat(32)}`
afterEach(() => vi.useRealTimers())

it('accepts Dusk addresses and resolved names, rejecting internal IDs and names without addresses', async () => {
  const resolved = await resolveRecipient(address,null)
  expect(resolved.address).toBe(address)
  await expect(resolveRecipient(owner,null)).rejects.toThrow('Enter a Dusk address')
  await expect(resolveRecipient('alice.dusk',null)).rejects.toThrow('lookup is unavailable')
  const resolveForward=vi.fn().mockResolvedValue({...verified,records:[{key:'moonlight_address',value:address}]})
  expect(await resolveRecipient('alice.dusk',{resolveForward,getHealth})).toMatchObject({address,authority:resolved.authority})
  resolveForward.mockResolvedValue({...verified,records:[]})
  await expect(resolveRecipient('alice.dusk',{resolveForward,getHealth})).rejects.toThrow('no Dusk address')
})

it('transfers owner and manager together, changes only the manager when requested, and rechecks named recipients', async () => {
  const recipient=await resolveRecipient(address,null)
  const submitNameWrite=vi.fn().mockResolvedValue({status:'executed',txId:'tx'})
  const setManagementError=vi.fn(), setManagedName=vi.fn()
  const resolveForward=vi.fn().mockResolvedValue({...verified,records:[{key:'moonlight_address',value:address}]})
  const props={canManageName:true,managedName:{owner,manager:owner},displayName:'alpha.dusk',nodeHex:'node',indexerClient:{resolveForward,getHealth},
    runtimeConfig:{contracts:{}},selectedAuthority:owner,submitNameWrite,setManagementError,setManagedName,setManagementTxState:vi.fn(),appendActivity:vi.fn(),
    ensureContractAuthorityForLiveWrite:()=>true,ensurePublicBalanceForLiveWrite:async()=>true,shouldApplyPreviewWriteFallback:async()=>true,
  } as unknown as Parameters<typeof updateDomainAuthorities>[0]
  expect(await updateDomainAuthorities(props,{kind:'transfer',recipient})).toBe(true)
  expect(submitNameWrite.mock.calls[0][1].args).toMatchObject({owner:recipient.authority,manager:recipient.authority})
  expect(submitNameWrite.mock.calls[0][2].ownershipChange).toBe('transfer')
  expect(setManagedName.mock.lastCall![0]({owner,manager:owner})).toMatchObject({owner:recipient.authority,manager:recipient.authority})
  expect(await updateDomainAuthorities(props,{kind:'manager',recipient})).toBe(true)
  expect(submitNameWrite.mock.calls[1][1].args).toMatchObject({owner,manager:recipient.authority})
  expect(submitNameWrite.mock.calls[1][2].ownershipChange).toBe('manager')
  resolveForward.mockResolvedValueOnce({...verified,records:[{key:'moonlight_address',value:otherAddress}]})
  await updateDomainAuthorities(props,{kind:'transfer',recipient:{...recipient,input:'alice.dusk'}})
  expect(submitNameWrite).toHaveBeenCalledTimes(2)
  expect(setManagementError).toHaveBeenLastCalledWith('The recipient changed. Check the address again before confirming.')
  await updateDomainAuthorities({...props,canManageName:false},{kind:'transfer',recipient})
  expect(submitNameWrite).toHaveBeenCalledTimes(2)
})


it.each([
  Uint8Array.from({length:96},(_,i)=>i+1),
  [0xc0, ...Array(95).fill(0)],
  [0x80, ...Array(95).fill(0)],
  [0x80, ...Array(94).fill(0), 2],
])('rejects malformed, zero, off-curve and out-of-subgroup public keys', async bytes => {
  await expect(resolveRecipient(encodeBase58(bytes), null)).rejects.toThrow('valid public key')
})

it.each([
  { verificationStatus: 'unverified' },
  { errors: [{ code: 'invalid_record', message: 'Invalid record' }] },
  { expiry: { status: 'expired', expiresAt: '2020-01-01T00:00:00Z' } },
  { expiry: { status: 'grace', expiresAt: '2020-01-01T00:00:00Z' } },
  { expiry: { status: 'active', expiresAt: '2020-01-01T00:00:00Z' } },
  { resolver: { health: 'invalid' } },
  { resolver: { health: 'missing' } },
  { canonicalName: 'someone-else.dusk' },
  { cache: { staleAt: '2020-01-01T00:00:00Z' } },
  { cache: { staleAt: 'invalid' } },
])('refuses unsafe named recipients at lookup and again before signing: %j', async invalid => {
  const resolveForward = vi.fn().mockResolvedValue({ ...verified, records: [{key:'moonlight_address',value:address}] })
  const indexerClient = { resolveForward, getHealth }
  const recipient = await resolveRecipient('alice.dusk', indexerClient)
  expect(recipient.address).toBe(address)
  resolveForward.mockResolvedValue({ ...verified, ...invalid, records: [{key:'moonlight_address',value:address}] })
  await expect(resolveRecipient('alice.dusk', indexerClient)).rejects.toThrow('Enter a Dusk address instead')
  const submitNameWrite = vi.fn(), setManagementError = vi.fn()
  for (const kind of ['transfer', 'manager'] as const) {
    await updateDomainAuthorities({ canManageName:true, indexerClient, submitNameWrite, setManagementError,
      ensureContractAuthorityForLiveWrite:()=>true, ensurePublicBalanceForLiveWrite:async()=>true,
    } as never, { kind, recipient })
  }
  expect(submitNameWrite).not.toHaveBeenCalled()
  expect(setManagementError).toHaveBeenLastCalledWith(expect.stringContaining('Enter a Dusk address instead'))
})

it('refetches stale named recipients and uses only the fresh address at lookup and before signing', async () => {
  const stale = { ...verified, cache: { staleAt: new Date(Date.now()).toISOString() }, records: [{key:'moonlight_address',value:otherAddress}] }
  const fresh = { ...verified, records: [{key:'moonlight_address',value:address}] }
  const resolveForward = vi.fn().mockResolvedValueOnce(stale).mockResolvedValue(fresh)
  const indexerClient = { resolveForward, getHealth }
  const recipient = await resolveRecipient('alice.dusk', indexerClient)
  expect(recipient.address).toBe(address)
  expect(resolveForward).toHaveBeenCalledTimes(2)
  resolveForward.mockResolvedValueOnce(stale).mockResolvedValue({ ...fresh, records: [{key:'moonlight_address',value:otherAddress}] })
  const submitNameWrite = vi.fn(), setManagementError = vi.fn()
  await updateDomainAuthorities({ canManageName:true, indexerClient, submitNameWrite, setManagementError,
    ensureContractAuthorityForLiveWrite:()=>true, ensurePublicBalanceForLiveWrite:async()=>true,
  } as never, { kind:'transfer', recipient })
  expect(resolveForward).toHaveBeenCalledTimes(4)
  expect(submitNameWrite).not.toHaveBeenCalled()
  expect(setManagementError).toHaveBeenLastCalledWith('The recipient changed. Check the address again before confirming.')
})

it('refuses named recipients when the source is unhealthy or lookup fails', async () => {
  const resolveForward = vi.fn().mockResolvedValue({ ...verified, records: [{key:'moonlight_address',value:address}] })
  await expect(resolveRecipient('alice.dusk', { resolveForward, getHealth: async () => ({ok:false}) as never }))
    .rejects.toThrow('Enter a Dusk address instead')
  resolveForward.mockRejectedValue(new Error('offline'))
  await expect(resolveRecipient('alice.dusk', { resolveForward, getHealth })).rejects.toThrow('Enter a Dusk address instead')
})

it.each(['transfer','manager'] as const)('refuses a recipient that becomes stale after review before signing a %s', async kind => {
  const response = {...verified,records:[{key:'moonlight_address',value:address}]}
  const resolveForward = vi.fn().mockResolvedValue(response)
  const indexerClient = {resolveForward,getHealth}
  const recipient = await resolveRecipient('alice.dusk',indexerClient)
  resolveForward.mockClear().mockResolvedValue({...response,cache:{staleAt:'2020-01-01T00:00:00Z'}})
  const submitNameWrite = vi.fn(), setManagementError = vi.fn()
  await updateDomainAuthorities({canManageName:true,managedName:{owner,manager:owner},indexerClient,submitNameWrite,setManagementError,
    displayName:'alpha.dusk',nodeHex:'node',runtimeConfig:{contracts:{}},
    ensureContractAuthorityForLiveWrite:()=>true,ensurePublicBalanceForLiveWrite:async()=>true,
  } as never,{kind,recipient})
  expect(submitNameWrite).not.toHaveBeenCalled()
  expect(resolveForward).toHaveBeenCalledTimes(2)
  expect(setManagementError).toHaveBeenLastCalledWith('This name cannot be verified as active. Enter a Dusk address instead.')
})

it('does not report success when all 15 ownership confirmation reads fail', async () => {
  const recipient = await resolveRecipient(address, null)
  vi.useFakeTimers()
  const getNameState = vi.fn().mockRejectedValue(new Error('offline'))
  let fallback!: ReturnType<typeof useIndexerWriteFallback>
  function Probe() {
    fallback = useIndexerWriteFallback({ indexerClient: {getNameState} as never, liveDuskDomainsApp:{} as never,
      refreshCurrentNameFromIndexer: vi.fn(), setIndexerError:vi.fn(), setIndexerConfirmation:vi.fn() })
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  const setManagedName = vi.fn()
  const pending = updateDomainAuthorities({canManageName:true,managedName:{owner,manager:owner},displayName:'alpha.dusk',nodeHex:'node',
    runtimeConfig:{contracts:{}}, submitNameWrite:async()=>({status:'executed'}), setManagementError:vi.fn(), setManagedName,
    ensureContractAuthorityForLiveWrite:()=>true, ensurePublicBalanceForLiveWrite:async()=>true, shouldApplyPreviewWriteFallback:fallback,
  } as never, {kind:'transfer',recipient})
  await vi.runAllTimersAsync()
  expect(await pending).toBe(false)
  expect(getNameState).toHaveBeenCalledTimes(15)
  expect(setManagedName).toHaveBeenCalledOnce()
  expect(setManagedName.mock.calls[0][0]({node:'node',owner,manager:owner})).toMatchObject({node:'node',owner:'',manager:''})
})

it.each([false, true])('uses the shared live ownership confirmation result (%s) without applying preview ownership', async ownershipConfirmed => {
  const recipient = await resolveRecipient(address, null)
  const shouldApplyPreviewWriteFallback = vi.fn(), setManagedName = vi.fn()
  const result = await updateDomainAuthorities({canManageName:true,managedName:{owner,manager:owner},displayName:'alpha.dusk',nodeHex:'node',
    runtimeConfig:{contracts:{}},submitNameWrite:async()=>({status:'executed',ownershipConfirmed}),setManagementError:vi.fn(),setManagedName,
    ensureContractAuthorityForLiveWrite:()=>true,ensurePublicBalanceForLiveWrite:async()=>true,shouldApplyPreviewWriteFallback,
  } as never, {kind:'transfer',recipient})
  expect(result).toBe(ownershipConfirmed)
  expect(shouldApplyPreviewWriteFallback).not.toHaveBeenCalled()
  expect(setManagedName).not.toHaveBeenCalled()
})
