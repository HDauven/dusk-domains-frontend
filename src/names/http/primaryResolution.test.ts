import { expect, it, vi } from 'vitest'
import { account } from '../../test/frozenFixtures'
import { namehashHex } from '../hash'
import { createDuskDomainsIndexerClient } from './client'

const name = 'amberquill.dusk'
const endpoint = { type: 'moonlight_address' as const, value: account }
const forward = {
  canonicalName: name, node: namehashHex(name),
  records: [{ key: 'moonlight_address', value: account, visibility: 'public', ttlSeconds: 60, updatedAt: '' }],
  expiry: { status: 'active', expiresAt: null }, resolver: { health: 'ok', resolverId: 'resolver' },
  verificationStatus: 'forward_resolved', cache: { asOf: '', ttlSeconds: 60, staleAt: '' }, warnings: [], errors: [],
}

it.each([false, true])('forward-verifies an authority-gated reverse response (endpoint included: %s)', async bound => {
  const fetcher = vi.fn(async (url: string) => Response.json(new URL(url).pathname === '/reverse'
    ? { name, node: namehashHex(name), ...(bound ? { endpoint } : {}) } : forward))
  const client = createDuskDomainsIndexerClient({ baseUrl: 'https://indexer.invalid', fetch: fetcher as never })
  expect(await client.getPrimaryName(endpoint)).toBe(name)
  expect(fetcher.mock.calls.map(([url]) => new URL(url).pathname)).toEqual(['/reverse', '/resolve'])
})

it('does not recover a raw candidate when authority-gated /reverse returns null', async () => {
  const fetcher = vi.fn(async () => Response.json(null))
  const client = createDuskDomainsIndexerClient({ baseUrl: 'https://indexer.invalid', fetch: fetcher })
  expect(await client.getPrimaryName(endpoint)).toBeNull()
  expect(fetcher).toHaveBeenCalledTimes(1)
})

it.each(['expired', 'unverified', 'unhealthy'])('rejects an endpoint-bound reverse candidate after a %s forward read', async reason => {
  const fetcher = vi.fn(async (url: string) => Response.json(new URL(url).pathname === '/reverse'
    ? { name, node: namehashHex(name), endpoint }
    : { ...forward,
      expiry: { ...forward.expiry, status: reason === 'expired' ? 'expired' : 'active' },
      resolver: { ...forward.resolver, health: reason === 'unhealthy' ? 'invalid' : 'ok' },
      verificationStatus: reason === 'unverified' ? 'unverified' : 'forward_resolved',
    }))
  const client = createDuskDomainsIndexerClient({ baseUrl: 'https://indexer.invalid', fetch: fetcher as never })
  expect(await client.getPrimaryName(endpoint)).toBeNull()
})
