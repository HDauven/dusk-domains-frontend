import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { useDuskDomainWriter } from './useDuskDomainWriter'
import { submitDuskDomainWrite, type DuskDomainTxState } from '../names/internal'

vi.mock('../names/internal', async importOriginal => ({
  ...await importOriginal<typeof import('../names/internal')>(), submitDuskDomainWrite: vi.fn(),
}))

it('allows only one wallet write at a time and releases the guard on either outcome', async () => {
  let submit!: ReturnType<typeof useDuskDomainWriter>
  function Probe() {
    submit = useDuskDomainWriter({ liveDuskDomainsApp: {}, liveWritesEnabled: false } as never)
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  const pending = Promise.withResolvers<DuskDomainTxState>()
  const executed = { status: 'executed' } as DuskDomainTxState
  vi.mocked(submitDuskDomainWrite).mockReturnValueOnce(pending.promise).mockResolvedValue(executed)
  const first = submit('first.dusk', {} as never)
  await expect(submit('second.dusk', {} as never)).rejects.toThrow('pending wallet transaction')
  expect(submitDuskDomainWrite).toHaveBeenCalledOnce()
  pending.resolve(executed)
  await first
  vi.mocked(submitDuskDomainWrite).mockRejectedValueOnce(new Error('Transport interrupted'))
  await expect(submit('third.dusk', {} as never)).rejects.toThrow('Transport interrupted')
  await expect(submit('fourth.dusk', {} as never)).resolves.toBe(executed)
})
