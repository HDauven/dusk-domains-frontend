// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { useTreasuryAccount } from './useTreasuryAccount'
import { useFeeConfig } from './useFeeConfig'
import { DEFAULT_FEE_CONFIG } from '../../names/internal'

const root = createRoot(document.createElement('div'))
afterEach(async () => { await act(async () => root.render(null)); vi.unstubAllGlobals() })

it('distinguishes an unread treasury from a real zero and preserves its last successful snapshot', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const getTreasury = vi.fn().mockRejectedValue(new Error('HTTP 429'))
  const client = { getTreasury } as never
  let data: ReturnType<typeof useTreasuryAccount>
  function Probe() { data = useTreasuryAccount(client); return null }
  await act(async () => root.render(<Probe />))
  expect(data!.treasuryLoaded).toBe(false)
  await act(async () => { await data.loadTreasury() })
  expect(data!.treasuryLoaded).toBe(false)
  getTreasury.mockResolvedValue({ availableLux: '42' })
  await act(async () => { await data.loadTreasury() })
  expect(data!.treasuryLoaded).toBe(true)
  getTreasury.mockRejectedValue(new Error('HTTP 429'))
  await act(async () => { await data.loadTreasury() })
  expect(data!.treasuryState.availableLux).toBe('42')
  expect(data!.treasuryError).toBe("Couldn't refresh. Retrying…")
})

it('never marks default prices as loaded after a failed first read', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const getFeeConfig = vi.fn().mockRejectedValue(new Error('HTTP 429'))
  const client = { getFeeConfig } as never
  let data: ReturnType<typeof useFeeConfig>
  function Probe() { data = useFeeConfig(client); return null }
  await act(async () => root.render(<Probe />))
  expect(data!.feeConfigLoaded).toBe(false)
  getFeeConfig.mockResolvedValue({ ...DEFAULT_FEE_CONFIG, version: 42 })
  await act(async () => { await data.loadFeeConfig() })
  expect(data!.feeConfigLoaded).toBe(true)
  getFeeConfig.mockRejectedValue(new Error('HTTP 429'))
  await act(async () => { await data.loadFeeConfig() })
  expect(data!.feeConfig.version).toBe(42)
  expect(data!.feeConfigError).toBe("Couldn't refresh. Retrying…")
})
