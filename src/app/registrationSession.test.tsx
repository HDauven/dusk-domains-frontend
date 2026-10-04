// @vitest-environment happy-dom
import { act, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { useRegistrationAppState } from './useRegistrationAppState'

it('clears prepared secrets on session changes and ignores old resume updates after returning', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div'), root = createRoot(host)
  let state!: ReturnType<typeof useRegistrationAppState>
  function Probe({ session }: { session: string }) {
    const current = useRegistrationAppState(session)
    useLayoutEffect(() => { state = current })
    return null
  }
  const saved = { controller: 'controller', ownerAddress: 'A', chainId: 'dusk:0', commitment: 'commit', secret: 'secret', committedBlockHeight: 10, committedTxId: 'tx', durationYears: 1 }
  try {
    await act(async () => root.render(<Probe session="A:1" />))
    await act(async () => state.searchActions.resume(saved as never))
    expect(state.preparedCommit?.secret).toBe(saved.secret)
    const delayed = state.searchActions.updateCommit
    const delayedSet = state.setPreparedCommit
    await act(async () => root.render(<Probe session="B:2" />))
    expect(state.preparedCommit).toBeNull()
    expect(state.committed).toBe(false)
    await act(async () => root.render(<Probe session="A:3" />))
    await act(async () => { delayed(saved); delayedSet(saved) })
    expect(state.preparedCommit).toBeNull()
  } finally {
    await act(async () => root.unmount())
    vi.unstubAllGlobals()
  }
})
