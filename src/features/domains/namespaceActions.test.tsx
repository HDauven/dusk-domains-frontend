import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { canControlSubname, writeSubnameAuthority } from './namespaceActions'
import { SubdomainList } from './subdomains/SubdomainList'
import type { SubnameState } from '../../names/internal'
import type { UseSubdomainActionsProps } from './subdomainActionTypes'

const leaf: SubnameState = { node: 'leaf', parentNode: 'child', parentName: 'docs.alice.dusk', label: 'api', name: 'api.docs.alice.dusk', owner: 'holder', manager: 'holder', expiresAt: 200, parentExpiresAt: 200, expiryPolicy: 'inherits_parent', createdAt: 0, status: 'active', resolver: '' }
const child = { ...leaf, node: 'child', parentNode: 'root', owner: 'parent-owner', manager: 'parent-manager' }
const root = { node: 'root', owner: 'root-owner', manager: 'root-manager', expiresAt: 300, graceEndsAt: 400, expiryPolicy: null, resolver: '' }
const base = { managedName: root, subnames: [child, leaf], selectedAuthority: 'root-owner', currentBlockHeight: 100 }
it.each(['root-owner', 'root-manager', 'parent-owner', 'parent-manager'])('shows nested Reassign and Remove for %s', selectedAuthority => {
  const props = { ...base, selectedAuthority }
  const markup = renderToStaticMarkup(<SubdomainList subnames={[leaf]}
    onRecordTargetSelect={() => {}}
    authority={{ selectedAuthority, canControlSubname: subname => canControlSubname(props, subname) }}
    clock={{ currentBlockHeight: 100, nowSeconds: 0 }} />)
  expect(markup).toContain('Reassign')
  expect(markup).toContain('Take back')
  expect(markup).toContain('Remove')
  expect(markup).toContain('Taking back or reassigning a subname always clears its records and primary name.')
})
it('rejects unrelated and former root authorities in escrow and permits expired targets', () => {
  expect(canControlSubname({ ...base, selectedAuthority: 'stranger' }, leaf)).toBe(false)
  expect(canControlSubname({ ...base, managedName: { ...root, owner: 'marketplace', manager: 'marketplace' } }, leaf)).toBe(false)
  const expired: SubnameState = { ...leaf, status: 'expired', expiresAt: 50 }
  expect(canControlSubname(base, expired)).toBe(true)
  expect(canControlSubname({ ...base, currentBlockHeight: null }, leaf)).toBe(false)
})
it('submits removal through the name writer and confirms disappearance', async () => {
  const submitNameWrite = Object.assign(vi.fn(async () => ({status:'executed'})), { captureWorkspace: () => () => true })
  const confirmation = vi.fn(async (_description, check) => { expect(await check({getNameState:async()=>({namespace:{subnames:[]}})})).toBe(true); return false })
  const props = { ...base, displayName:'alice.dusk', submitNameWrite, shouldApplyPreviewWriteFallback:confirmation,
    setSubnameError:vi.fn(),setSubnameTxState:vi.fn(),ensureContractAuthorityForLiveWrite:()=>true,
    ensurePublicBalanceForLiveWrite:async()=>true,runtimeConfig:{contracts:{}} } as unknown as UseSubdomainActionsProps
  await writeSubnameAuthority(props, leaf)
  expect(submitNameWrite).toHaveBeenCalledWith('alice.dusk', expect.objectContaining({functionName:'remove_subname_runtime',args:{node:'leaf'}}), expect.anything())
  expect(confirmation).toHaveBeenCalledOnce()
})

it('does not authorize names outside the displayed namespace', () => {
  expect(canControlSubname(base, { ...leaf, parentNode: 'unrelated' })).toBe(false)
})

it('submits reassignments with the chosen owner and manager and checks projected authorities', async () => {
  const owner = `0x${'11'.repeat(32)}`, manager = `0x${'22'.repeat(32)}`
  const submitNameWrite = Object.assign(vi.fn(async () => ({status:'executed'})), { captureWorkspace: () => () => true })
  const confirmation = vi.fn(async (_description, check) => {
    expect(await check({getNameState:async()=>({namespace:{subnames:[{node:'leaf',owner,manager}]}})})).toBe(true)
    expect(await check({getNameState:async()=>null})).toBe(false)
    return false
  })
  const props = { ...base, displayName:'alice.dusk', submitNameWrite, shouldApplyPreviewWriteFallback:confirmation,
    setSubnameError:vi.fn(),setSubnameTxState:vi.fn(),ensureContractAuthorityForLiveWrite:()=>true,
    ensurePublicBalanceForLiveWrite:async()=>true,runtimeConfig:{contracts:{}} } as unknown as UseSubdomainActionsProps
  await writeSubnameAuthority(props, leaf, {owner:`contract:${owner}`,manager:`contract:${manager}`})
  expect(submitNameWrite).toHaveBeenCalledWith('alice.dusk',expect.objectContaining({functionName:'update_authorities_runtime',args:{node:'leaf',owner,manager,clearRecords:true}}),expect.anything())
  expect(confirmation).toHaveBeenCalledOnce()
})


it('allows take-back on the displayed subname without granting record management', async () => {
  const authority = `0x${'11'.repeat(32)}`
  const managedName = { ...root, node: leaf.node, owner: 'holder', manager: 'holder', ancestors: [
      {node:'child',name:'docs.alice.dusk',owner:authority,manager:authority,expiresAtBlockHeight:200},
    ] }
  const submitNameWrite = Object.assign(vi.fn(async () => ({status:'executed'})), { captureWorkspace: () => () => true })
  const confirmation = vi.fn(async (_description, check) => {
    expect(await check({getNameState:async()=>({node:leaf.node,owner:authority,manager:authority})})).toBe(true)
    return false
  })
  const props = {...base,managedName,selectedAuthority:authority,displayName:leaf.name,submitNameWrite,
    shouldApplyPreviewWriteFallback:confirmation,setSubnameError:vi.fn(),setSubnameTxState:vi.fn(),
    ensureContractAuthorityForLiveWrite:()=>true,ensurePublicBalanceForLiveWrite:async()=>true,runtimeConfig:{contracts:{}}} as unknown as UseSubdomainActionsProps
  expect(canControlSubname(props, leaf)).toBe(true)
  await writeSubnameAuthority(props, leaf, 'take_back')
  expect(submitNameWrite).toHaveBeenCalledWith(leaf.name, expect.objectContaining({functionName:'update_authorities_runtime',args:{node:leaf.node,owner:authority,manager:authority,clearRecords:true}}), expect.anything())
  expect(confirmation).toHaveBeenCalledOnce()
  await writeSubnameAuthority({...props,selectedAuthority:'stranger'}, leaf, 'take_back')
  expect(submitNameWrite).toHaveBeenCalledOnce()
})

it.each(['reassign', 'take_back'] as const)('resets identity on %s when the caller owns both the parent and subname', async action => {
  const alice = `0x${'11'.repeat(32)}`, bob = `0x${'22'.repeat(32)}`
  const subname = { ...child, owner: alice, manager: alice }
  const submitNameWrite = Object.assign(vi.fn(async () => ({status:'executed'})), { captureWorkspace: () => () => true })
  const props = { ...base, managedName: { ...root, owner: alice, manager: alice }, subnames: [subname],
    selectedAuthority: alice, displayName: 'alice.dusk', submitNameWrite,
    shouldApplyPreviewWriteFallback: vi.fn(async () => false), setSubnameError: vi.fn(), setSubnameTxState: vi.fn(),
    ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
    runtimeConfig: {contracts:{}} } as unknown as UseSubdomainActionsProps
  await writeSubnameAuthority(props, subname, action === 'take_back' ? action : {owner:`contract:${bob}`,manager:`contract:${bob}`})
  const recipient = action === 'take_back' ? alice : bob
  expect(submitNameWrite).toHaveBeenCalledWith('alice.dusk', expect.objectContaining({
    functionName: 'update_authorities_runtime', args: {node:subname.node,owner:recipient,manager:recipient,clearRecords:true},
  }), expect.anything())
})
