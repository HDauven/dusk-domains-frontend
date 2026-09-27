import { describe, expect, it, vi } from 'vitest'
import {
  blockHeightFromGraphqlResponse,
  fetchDuskNodeCurrentBlockHeight,
} from './duskNodeHeight'

describe('dusk node block height', () => {
  it('bounds a stalled height fetch and returns unavailable height after abort', async () => {
    const controller = new AbortController()
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal)
    const fetchImpl: typeof fetch = async (_input, init) => new Promise((_resolve, reject) => {
      if (!init?.signal) return reject(new Error('Missing abort signal'))
      init.signal.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
    })
    const pending = fetchDuskNodeCurrentBlockHeight('http://node.test/', fetchImpl)
    try {
      expect(timeout).toHaveBeenCalledExactlyOnceWith(10_000)
      controller.abort()
      await expect(pending).resolves.toBeNull()
    } finally {
      controller.abort()
      timeout.mockRestore()
    }
  })

  it('reads numeric and string block heights from GraphQL responses', () => {
    expect(blockHeightFromGraphqlResponse({
      data: { block: { header: { height: 3718426 } } },
    })).toBe(3718426)
    expect(blockHeightFromGraphqlResponse({
      data: { block: { header: { height: '3718427' } } },
    })).toBe(3718427)
  })

  it('rejects missing or unsafe block heights', () => {
    expect(blockHeightFromGraphqlResponse({ data: null })).toBeNull()
    expect(blockHeightFromGraphqlResponse({
      data: { block: { header: { height: -1 } } },
    })).toBeNull()
    expect(blockHeightFromGraphqlResponse({
      data: { block: { header: { height: Number.MAX_SAFE_INTEGER + 1 } } },
    })).toBeNull()
  })

  it('calls the Rusk GraphQL endpoint with the latest-block query', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      data: { block: { header: { height: 3718430 } } },
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    }))

    await expect(fetchDuskNodeCurrentBlockHeight('https://testnet.nodes.dusk.network', fetchImpl as typeof fetch))
      .resolves
      .toBe(3718430)

    expect(fetchImpl).toHaveBeenCalledWith(new URL('https://testnet.nodes.dusk.network/graphql'), expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('block(height: -1)'),
    }))
  })
})
