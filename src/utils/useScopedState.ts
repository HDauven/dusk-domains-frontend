import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

// Reset on context changes and ignore late updates from a previous context,
// including an A → B → A account switch while A's old request is still pending.
export function useScopedState<T>(scope: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState(() => ({ scope, value: initial, token: {} }))
  if (state.scope !== scope) setState({ scope, value: initial, token: {} })
  const token = state.token
  const update = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setState(current => current.token !== token ? current : {
      ...current,
      value: typeof next === 'function' ? (next as (value: T) => T)(current.value) : next,
    })
  }, [token])
  return [state.scope === scope ? state.value : initial, update]
}
