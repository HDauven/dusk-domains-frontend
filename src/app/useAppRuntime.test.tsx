// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { useAppRuntime } from './useAppRuntime'

it('keeps one runtime config when the env object is rebuilt with the same values', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const configs = new Set<unknown>()
  function Probe({ tick }: { tick: number }) {
    // As in a production build, where import.meta.env is a new object at each use.
    configs.add(useAppRuntime({ VITE_DUSK_DOMAINS_ROUTER_CONTRACT_ID: `0x${'11'.repeat(32)}` }).runtimeConfig)
    return <span>{tick}</span>
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => { root.render(<Probe tick={1} />) })
    await act(async () => { root.render(<Probe tick={2} />) })
    await act(async () => { root.render(<Probe tick={3} />) })
    expect(configs.size).toBe(1)
  } finally {
    await act(async () => { root.unmount() })
    container.remove()
  }
})
