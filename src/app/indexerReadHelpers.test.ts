import { afterEach, expect, it, vi } from 'vitest'
import { createHealthyIndexerClient, waitForIndexerBlock } from './indexerReadHelpers'
import { checkAvailability } from '../features/search/actions/checkAvailability'

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

it('rejects stale, malformed and unreachable health before reading projections, and recovers', async () => {
  let health: unknown = {
    ok: false, generatedAt: new Date().toISOString(), source: 'sqlite', mode: 'sqlite',
    currentBlockHeight: 100, finalizedBlockHeight: 100, lagBlocks: 0, routes: [], names: 0,
  }
  const fetcher = vi.fn(async (input, init) => {
    expect(init.signal).toBeInstanceOf(AbortSignal)
    return Response.json(String(input).endsWith('/health') ? health : [])
  })
  vi.stubGlobal('fetch', fetcher)
  const client = createHealthyIndexerClient('http://localhost:8793/api/')
  expect((await client.getHealth()).ok).toBe(false)
  await expect(client.getNames()).rejects.toThrow('still syncing')
  expect(fetcher.mock.calls.every(([url]) => String(url).endsWith('/api/health'))).toBe(true)
  health = { ...(health as object), ok: true }
  await expect(client.getNames()).resolves.toEqual([])
  expect(fetcher.mock.calls.at(-1)?.[0]).toBe('http://localhost:8793/api/names')
  health = { ok: true }
  await expect(client.getNames()).rejects.toThrow('invalid health')
  fetcher.mockRejectedValueOnce(new TypeError('Failed to fetch'))
  await expect(client.getNames()).rejects.toThrow('Failed to fetch')
})

it('waits for healthy finalized coverage, not just a current head, and times out safely', async () => {
  vi.useFakeTimers()
  const getHealth = vi.fn().mockResolvedValue({ ok: true, currentBlockHeight: 200, finalizedBlockHeight: 99 })
  let refreshed = false
  const pending = waitForIndexerBlock({ getHealth } as never, 100).then(value => { refreshed = value })
  await vi.advanceTimersByTimeAsync(1_000)
  expect(refreshed).toBe(false)
  getHealth.mockResolvedValue({ ok: false, finalizedBlockHeight: 200 })
  await vi.advanceTimersByTimeAsync(1_000)
  expect(refreshed).toBe(false)
  getHealth.mockResolvedValue({ ok: true, finalizedBlockHeight: 100 })
  await vi.advanceTimersByTimeAsync(1_000)
  await pending
  expect(refreshed).toBe(true)
  getHealth.mockResolvedValue({ ok: true, finalizedBlockHeight: null })
  const timeout = waitForIndexerBlock({ getHealth } as never, 100)
  await vi.runAllTimersAsync()
  expect(await timeout).toBe(false)
  expect(await waitForIndexerBlock(null, 100)).toBe(false)
  expect(await waitForIndexerBlock({ getHealth } as never, null)).toBe(false)
})

it('clears the previous availability before a retry that fails', async () => {
  const setApiSearchResult = vi.fn()
  const setIndexerError = vi.fn()
  await checkAvailability({
    query: 'owned.dusk', indexerClient: { searchName: async () => { throw new Error('Failed to fetch') } },
    setApiSearchResult, setIndexerError, setChecked: vi.fn(), setResultView: vi.fn(),
    setRegistrationStep: vi.fn(), setActivityLoading: vi.fn(), setIndexerConfirmation: vi.fn(),
  } as never)
  expect(setApiSearchResult.mock.calls).toEqual([[null]])
  expect(setIndexerError.mock.calls.at(-1)?.[0]).toMatch(/not reachable/)
})
