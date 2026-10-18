import * as sdk from '@duskdomains/sdk'

/**
 * The stores the directory admits, in admission order, read through the client's directory at the
 * height of the snapshot the caller reads in. Each store is verified the first time a read goes
 * through it.
 */
export async function admittedStores(client: sdk.FrozenClient): Promise<sdk.Admission[]> {
  const rows: sdk.Admission[] = []
  let start = 0
  for (let page = 0; page < 4; page++) {
    const result = await client.directory.members({ kind: 'Store', start, limit: 16 })
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

/**
 * A store's own answer for a name, not followed. The SDK's `home` and Located reads follow a root's
 * forwards from the store they start at, but clear_primary is refused by the store keeping the link
 * while that link's name has moved on from it. The store is verified with the client first.
 */
export async function storeOwnRead<M extends 'home' | 'get_name'>(
  client: sdk.FrozenClient,
  store: string,
  method: M,
  args: sdk.Input<'store', M>,
): Promise<sdk.Output<'store', M>> {
  store = sdk.contractId(store)
  await client.verifyContract('store', store)
  const driver = client.release.drivers.get(store)!
  const spec = sdk.methodDefinition('store', method)
  const bytes = await client.transport.read(store, method, driver.encodeInput(method, sdk.stringifyJson(sdk.wireValue(spec.input, args))))
  return sdk.wireValue(spec.output, driver.decodeOutput(method, bytes)) as sdk.Output<'store', M>
}
