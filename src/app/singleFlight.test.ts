import { expect, it, vi } from 'vitest'
import { createSingleFlight } from './singleFlight'

it('joins concurrent triggers and queues only one fresh read after a write', async () => {
  const run = createSingleFlight<number>()
  const first = Promise.withResolvers<number>(), next = Promise.withResolvers<number>()
  const read = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(next.promise)
  const navigation = run(read, 'owner')
  expect(run(read, 'owner')).toBe(navigation)
  const write = run(read, 'owner', true)
  expect(run(read, 'owner', true)).toBe(write)
  expect(run(read, 'owner')).toBe(write)
  await Promise.resolve()
  expect(read).toHaveBeenCalledOnce()
  first.resolve(1)
  expect(await navigation).toBe(1)
  await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(2))
  next.resolve(2)
  expect(await write).toBe(2)
})

it('runs different scopes independently and releases a failed request', async () => {
  const run = createSingleFlight<string>()
  const first = Promise.withResolvers<string>()
  const later = vi.fn(async () => 'B')
  const old = run(() => first.promise, 'A')
  const failed = expect(old).rejects.toThrow('offline')
  const next = run(later, 'B')
  expect(await next).toBe('B')
  first.reject(new Error('offline'))
  await failed
  await Promise.resolve()
  expect(await run(async () => 'C', 'C')).toBe('C')
})


it('starts another read when the previous caller has completed', async () => {
  const run = createSingleFlight<number>()
  expect(await run(async () => 1, 'owner')).toBe(1)
  expect(await run(async () => 2, 'owner')).toBe(2)
})

it('keeps alpha → beta → alpha callers on their own scope', async () => {
  const run = createSingleFlight<string>()
  const alpha = Promise.withResolvers<string>(), beta = Promise.withResolvers<string>()
  const first = run(() => alpha.promise, 'alpha.dusk')
  const other = run(() => beta.promise, 'beta.dusk')
  const latest = run(() => alpha.promise, 'alpha.dusk')
  expect(latest).toBe(first)
  expect(other).not.toBe(first)
  beta.resolve('beta.dusk')
  expect(await other).toBe('beta.dusk')
  alpha.resolve('alpha.dusk')
  expect(await latest).toBe('alpha.dusk')
})

it('keeps fresh trailing reads separate for each scope', async () => {
  const run = createSingleFlight<string>()
  const alpha = Promise.withResolvers<string>(), beta = Promise.withResolvers<string>()
  const first = run(() => alpha.promise, ['alpha.dusk'])
  const other = run(() => beta.promise, ['beta.dusk'])
  const freshAlpha = run(async () => 'fresh alpha', ['alpha.dusk'], true)
  const freshBeta = run(async () => 'fresh beta', ['beta.dusk'], true)
  expect(run(async () => 'unused', ['alpha.dusk'])).toBe(freshAlpha)
  expect(run(async () => 'unused', ['beta.dusk'], true)).toBe(freshBeta)
  alpha.resolve('alpha.dusk')
  beta.resolve('beta.dusk')
  expect(await Promise.all([first, other, freshAlpha, freshBeta])).toEqual(['alpha.dusk', 'beta.dusk', 'fresh alpha', 'fresh beta'])
})
