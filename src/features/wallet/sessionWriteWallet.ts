import { DuskWallet, type DuskProvider } from '@dusk/connect'
import type { DuskWalletLike } from './walletSessionTypes'
import { walletConnectionStatus } from './walletStatus'

export class WalletSessionChangedError extends Error {
  constructor() {
    super('The wallet session changed. Connect your wallet and try again.')
  }
}

export function createSessionWriteWallet(wallet: DuskWallet, session: Pick<DuskWalletLike, 'state'>, chainId: string, nodeUrl: string) {
  const provider = wallet.provider
  const profile = session.state.selectedProfile
  const generation = session.state.generation
  const checkSession = () => {
    const state = session.state
    if (!provider || wallet.provider !== provider || state.generation !== generation || state.explicitlyDisconnected
      || walletConnectionStatus(state, true, chainId, chainId === 'dusk:0' ? nodeUrl : '') !== 'connected'
      || state.chainId?.trim().toLowerCase() !== chainId.trim().toLowerCase()
      || !profile || state.selectedProfile?.account !== profile.account || state.selectedProfile?.profileId !== profile.profileId) {
      throw new WalletSessionChangedError()
    }
  }
  checkSession()
  // The documented explicit-provider option keeps this guard local to one write.
  const guardedProvider = new Proxy({} as DuskProvider, {
    get(_target, key) {
      const target = provider!
      if (key === 'request') {
        const request: DuskProvider['request'] = args => {
          if (args.method === 'dusk_sendTransaction') checkSession()
          return target.request(args)
        }
        return request
      }
      if (key === 'on') {
        const on: DuskProvider['on'] = (event, handler) => {
          target.on(event, handler)
          // Carry the already observed local node into connect's chain check.
          if (event === 'duskNodeChanged' && session.state.node) handler(session.state.node)
        }
        return on
      }
      const value = Reflect.get(target, key, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  // Omitting discovery metadata prevents announcements from replacing the wrapper.
  return new DuskWallet({ provider: guardedProvider, autoRefresh: false, rememberLastUsedProvider: false })
}
