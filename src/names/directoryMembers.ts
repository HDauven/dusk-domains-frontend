import * as sdk from '@duskdomains/sdk'

type Client = Pick<sdk.FrozenClient, 'release' | 'transport' | 'directoryId' | 'verifyContract'>

/**
 * One read as SDK 0.3.2 reads inside its own snapshots: encoded by the contract's release driver
 * and answered at the node's tip, without a snapshot of its own. In SDK 0.3.2 every public read
 * takes the tip height twice more, and a snapshot of such reads crosses a block under load. Only
 * for a contract this client has verified.
 */
export async function rawRead<R extends sdk.ContractRole, M extends sdk.Method<R>>(
  client: Pick<Client, 'release' | 'transport'>,
  role: R,
  id: string,
  method: M,
  args: sdk.Input<R, M>,
): Promise<sdk.Output<R, M>> {
  id = sdk.contractId(id)
  const descriptor = client.release.contracts.get(id),
    driver = client.release.drivers.get(id)
  if (!descriptor || descriptor.role !== role || !driver) throw new Error(`No verified ${role} driver for ${id}`)
  const spec = sdk.methodDefinition(role, method)
  if (spec.mode !== 'read') throw new Error('Write method used as a read')
  const bytes = await client.transport.read(id, method, driver.encodeInput(method, sdk.stringifyJson(sdk.wireValue(spec.input, args))))
  return sdk.wireValue(spec.output, driver.decodeOutput(method, bytes)) as sdk.Output<R, M>
}

/** The directory's members of one kind, in admission order, checked as SDK 0.3.2 checks them. */
export async function directoryMembers(client: Client, kind: sdk.MemberKind): Promise<sdk.Admission[]> {
  const rows: sdk.Admission[] = []
  let start = 0
  for (let page = 0; page < 4; page++) {
    const result = await rawRead(client, 'directory', client.directoryId, 'members', { kind, start, limit: 16 })
    for (const member of result.rows) {
      if (member.ordinal !== rows.length || rows.some((row) => sdk.contractId(row.id) === sdk.contractId(member.id)))
        throw new Error('Invalid directory admission order')
      rows.push(member)
    }
    if (result.next === null) return rows
    if (result.next <= start || result.next !== rows.length) throw new Error('Invalid admission cursor')
    start = result.next
  }
  throw new Error('Directory membership exceeds frozen bound')
}

// Contracts these reads verified, per client. What verification checks, a contract's interface,
// binding and admitted code hash, never changes.
const verifiedBy = new WeakMap<object, Set<string>>()
async function verifiedOnce(client: Client, role: sdk.ContractRole, id: string, admission?: sdk.Admission) {
  let verified = verifiedBy.get(client)
  if (!verified) verifiedBy.set(client, (verified = new Set()))
  if (verified.has(id)) return
  await client.verifyContract(role, id, admission)
  verified.add(id)
}

/**
 * The stores the directory admits, each verified against its admission once per client. A read
 * across every store calls it before its snapshot, to verify a store admitted since, and inside,
 * where it costs one round trip. SDK 0.3.2's discover() verifies every contract again on each call,
 * the selected policy included: a snapshot that long crosses a block under load, and a policy this
 * release doesn't list yet fails it outright.
 */
export async function admittedStores(client: Client): Promise<sdk.Admission[]> {
  await verifiedOnce(client, 'directory', client.directoryId)
  const [config, stores] = await Promise.all([
    rawRead(client, 'directory', client.directoryId, 'config', null),
    directoryMembers(client, 'Store'),
  ])
  if (stores.length !== config.store_count) throw new Error('Directory member count mismatch')
  for (const row of stores) await verifiedOnce(client, 'store', sdk.contractId(row.id), row)
  return stores
}

/**
 * SDK 0.3.2's discover() without the policy the directory selects, as SDK 0.4.0 discovers. A
 * SetPolicy can select a policy this release doesn't list yet. Only registration uses it, and it
 * verifies the policy when it quotes.
 */
export async function discoverWithoutPolicy(client: sdk.FrozenClient): Promise<sdk.DirectoryState> {
  await client.verifyContract('directory', client.directoryId)
  return client.snapshot(async (height) => {
    const [config, stores, resolvers] = await Promise.all([
      rawRead(client, 'directory', client.directoryId, 'config', null),
      directoryMembers(client, 'Store'),
      directoryMembers(client, 'Resolver'),
    ])
    if (stores.length !== config.store_count || resolvers.length !== config.resolver_count)
      throw new Error('Directory member count mismatch')
    for (const row of stores) await client.verifyContract('store', sdk.contractId(row.id), row)
    for (const row of resolvers) await client.verifyContract('resolver', sdk.contractId(row.id), row)
    await client.verifyContract('vault', client.vaultId)
    if (config.preferred_marketplace)
      await client.verifyContract('marketplace', sdk.contractId(config.preferred_marketplace))
    return { height, config, stores, resolvers }
  })
}
