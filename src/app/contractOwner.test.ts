import { expect, it, vi } from 'vitest'
import { isDeployedContract } from './contractOwner'

const id = '11'.repeat(32)
it.each(['00'.repeat(32), `0x${'00'.repeat(32)}`])('never queries a zero contract ID: %s', async authority => {
  const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ contract_owner: id })))
  expect(await isDeployedContract('https://node.example', authority, new AbortController().signal, fetchImpl)).toBe(false)
  expect(fetchImpl).not.toHaveBeenCalled()
})
it('requires deployed contract metadata before treating a name authority as a contract', async () => {
  const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ contract_owner: '00'.repeat(32) })))
  const signal = new AbortController().signal
  expect(await isDeployedContract('https://node.example', `0x${id}`, signal, fetchImpl)).toBe(true)
  expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(`https://node.example/on/contract:${id}/metadata`)
  expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ method: 'POST', signal })
})
it.each([{ contract_owner: '' }, {}, { contract_owner: false }, { contract_owner: 'invalid' }])('rejects absent or malformed metadata %j', async metadata => {
  expect(await isDeployedContract('https://node.example', id, new AbortController().signal,
    async () => new Response(JSON.stringify(metadata)))).toBe(false)
})
it('fails closed for unavailable metadata and never queries an invalid authority', async () => {
  const fetchImpl = vi.fn(async () => { throw new Error('offline') })
  const signal = new AbortController().signal
  expect(await isDeployedContract('https://node.example', 'owner', signal, fetchImpl)).toBe(false)
  expect(fetchImpl).not.toHaveBeenCalled()
  expect(await isDeployedContract('https://node.example', id, signal, fetchImpl)).toBe(false)
  expect(await isDeployedContract('https://node.example', id, signal, async () => new Response('', { status: 404 }))).toBe(false)
})
