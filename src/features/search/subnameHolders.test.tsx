import { renderToStaticMarkup } from 'react-dom/server'
import { encodeBase58 } from '@duskdomains/sdk'
import { expect, it, vi } from 'vitest'
import { account } from '../../test/frozenFixtures'
import { handoff } from '../../test/handoffFixtures'
import { contractPrincipalFromWalletAccount, endpointBytes, namehashHex, type DuskDomainsIndexerClient, type NameResult } from '../../names/internal'
import { OwnerLabel } from '../identity/OwnerLabel'
import { ownerAddressCandidates, ownerLabel } from '../identity/ownerLabel'
import { applyIndexedNameHydration } from './applyIndexedNameHydration'
import { readIndexedName } from './indexedNameReads'
import { NameHeader } from './NameHeader'
import { useSearchWorkspaceFeature } from './useSearchWorkspaceFeature'

const text = (html: string) => html.replaceAll('&#x27;', '\'').replaceAll('<!-- -->', '')
const authorityOf = (address: string) => {
  const parsed = contractPrincipalFromWalletAccount(address)
  if (!parsed.ok) throw new Error('Invalid fixture')
  return parsed.principal
}
// Sam owns nightowlshq.dusk and created maya.nightowlshq.dusk for Maya: he owns it, she manages it.
const samAddress = account
const mayaAddress = encodeBase58(Uint8Array.from(handoff.roles.payout))
const sam = authorityOf(samAddress), maya = authorityOf(mayaAddress)
const header = (props: Partial<Parameters<typeof NameHeader>[0]>) => text(renderToStaticMarkup(<NameHeader displayName="maya.nightowlshq.dusk"
  lifecycleLabel={null} primaryVerified={false} records={[]} reserved={false} status="registered" owner={sam} manager={maya} {...props} />))

it('shows who manages a name beside who owns it', () => {
  // Sam sees himself as owner and Maya as manager, not only "Owner: You".
  const owner = header({ viewerAuthority: sam, ownerAddresses: [mayaAddress] })
  expect(owner).toMatch(/Owner <span>You<\/span>/)
  expect(owner).toMatch(new RegExp(`Manager <span class="address-chip"[^]*${mayaAddress}`))
  // Maya sees Sam by his Dusk address once it is known, and herself as manager.
  const manager = header({ viewerAuthority: maya, ownerAddresses: [samAddress] })
  expect(manager).toMatch(new RegExp(`Owner <span class="address-chip"[^]*${samAddress}`))
  expect(manager).toMatch(/Manager <span>You<\/span>/)
  // One wallet holding both roles is shown once.
  expect(header({ manager: sam, viewerAuthority: sam })).not.toContain('Manager')
})

it('names an account it cannot match to an address plainly', () => {
  const id = `0x${'ab'.repeat(32)}`
  expect(ownerLabel(id)).toMatchObject({ kind: 'id', label: 'Account ID 0xabababab...ababab' })
  const html = text(renderToStaticMarkup(<OwnerLabel authority={id} />))
  expect(html).toContain('Account ID 0xabababab...ababab')
  expect(html).toContain('The registry stores an ID made from each account\'s Dusk address, or a contract\'s own ID. No address seen on this page matches this one yet.')
  expect(html).not.toContain('Owner ID')
})

it('knows the registrant from a frozen registration event, and a primary name\'s address', () => {
  const payer = { kind: 'Moonlight', bytes: Array.from(endpointBytes(samAddress)) }
  const candidates = ownerAddressCandidates([], [{ eventType: 'root_registered', target: null, data: { payer } }])
  expect(candidates).toEqual([samAddress])
  expect(ownerAddressCandidates([], [{ eventType: 'primary_changed', data: { endpoint: Array.from(endpointBytes(mayaAddress)), reason: 'Set' } }])).toEqual([mayaAddress])
  // A contract payer or a malformed endpoint offers nothing.
  expect(ownerAddressCandidates([], [{ eventType: 'root_registered', data: { payer: { kind: 'Contract', bytes: Array(32).fill(1) } } },
    { eventType: 'primary_changed', data: { endpoint: [1, 2, 3] } }])).toEqual([])
  expect(ownerLabel(sam, { addresses: candidates })).toMatchObject({ kind: 'address', value: samAddress })
})

it('reads the Dusk addresses of the names above a subname to show their holders', async () => {
  const node = namehashHex('maya.nightowlshq.dusk')
  const parent = { node: namehashHex('nightowlshq.dusk'), name: 'nightowlshq.dusk', owner: sam, manager: sam, expiresAtBlockHeight: 200 }
  const getNodeRecord = vi.fn(async (_node: string, key: string) => key === 'moonlight_address' ? { key, value: samAddress, visibility: 'public', ttlSeconds: 300, updatedAt: '' } : null)
  const client = {
    resolveForward: vi.fn(async () => ({ records: [{ key: 'moonlight_address', value: mayaAddress }] })),
    getNameState: vi.fn(async () => ({ node, owner: sam, manager: maya, expiresAtBlockHeight: 100, graceEndsAtBlockHeight: 100, namespace: { ancestors: [parent] } })),
    getActivityPage: vi.fn(async () => ({ activity: [] })), getAllSubnames: vi.fn(async () => []), getSubname: vi.fn(async () => null),
    getPrimaryName: vi.fn(async () => null), getNodeRecord,
  } as unknown as DuskDomainsIndexerClient
  const reads = await readIndexedName(client, { canonical: 'maya.nightowlshq.dusk' } as NameResult, '')
  expect(getNodeRecord).toHaveBeenCalledWith(parent.node, 'moonlight_address')
  expect(reads?.ancestorAddresses).toEqual([samAddress])
  expect(reads?.readErrors).toEqual([])
  // An unavailable parent address leaves the page as it was.
  getNodeRecord.mockRejectedValueOnce(new Error('Indexer unavailable'))
  const failed = await readIndexedName(client, { canonical: 'maya.nightowlshq.dusk' } as NameResult, '')
  expect(failed?.ancestorAddresses).toEqual([])
  expect(failed?.readErrors).toEqual([])

  let managedName: { ancestorAddresses?: string[] } | null = null
  applyIndexedNameHydration({
    currentBlockHeight: 10, nowSeconds: 0, recordSourceContractId: 'resolver',
    domain: { hydrate: (snapshot: { managedName: typeof managedName }) => { managedName = snapshot.managedName } },
    records: { hydrate: vi.fn() }, activity: { hydrate: vi.fn() },
  } as never, reads!)
  expect(managedName!.ancestorAddresses).toEqual([samAddress])

  // The name page offers those addresses, as candidates, wherever it labels a holder.
  const { searchProps } = useSearchWorkspaceFeature({
    activityEntries: [], parentResolverRecords: [], nodeHex: node, viewerAuthority: maya, displayName: 'maya.nightowlshq.dusk',
    settingsProps: { managedName: { node, owner: sam, manager: maya, ancestorAddresses: [samAddress] } },
    primaryProps: { primaryVerification: { verified: false } }, registrationProps: { wizard: { registrationComplete: false } },
    resultStatus: 'registered',
  } as never)
  expect(searchProps.result.headerProps.ownerAddresses).toContain(samAddress)
  expect(searchProps.result.activityProps.ownerAddresses).toContain(samAddress)
  expect(searchProps.result.headerProps.manager).toBe(maya)
})
