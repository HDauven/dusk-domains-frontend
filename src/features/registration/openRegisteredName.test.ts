import { expect, it, vi } from 'vitest'
import type { DuskDomainsIndexerClient } from '../../names/internal'
import { openRegisteredName } from './openRegisteredName'

it('waits for the indexer to see the registration before opening the name', async () => {
  const statuses = ['available', 'available', 'registered']
  const searchName = vi.fn(async () => ({ status: statuses.shift() ?? 'registered' }))
  const open = vi.fn()

  await openRegisteredName({ searchName } as unknown as DuskDomainsIndexerClient, 'fresh.dusk', open, { delayMs: 0 })

  expect(searchName).toHaveBeenCalledTimes(3)
  expect(open).toHaveBeenCalledExactlyOnceWith('fresh.dusk')
})

it('still opens the name when the indexer never catches up', async () => {
  const open = vi.fn()
  const searchName = vi.fn(async () => { throw new Error('offline') })

  await openRegisteredName({ searchName } as unknown as DuskDomainsIndexerClient, 'slow.dusk', open, { attempts: 2, delayMs: 0 })

  expect(searchName).toHaveBeenCalledTimes(2)
  expect(open).toHaveBeenCalledOnce()
})
