import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  refreshWalletSessionState: vi.fn(),
  selectedAddress: 'A',
}))

vi.mock('../features/wallet/useDuskWalletSession', () => ({
  useDuskWalletSession: () => ({
    handleOpenWalletConnection: vi.fn(),
    handleRefreshWalletProviders: vi.fn(),
    refreshWalletConnectionState: vi.fn(),
    refreshWalletSessionState: mocks.refreshWalletSessionState,
    setWalletError: vi.fn(),
    walletDiscoveryReady: true,
    walletDiscoveryRefreshing: false,
    walletError: '',
    walletBusy: false,
    walletState: {
      authorized: true,
      installed: true,
      profiles: [{ account: 'A', profileId: 'primary' }],
      accounts: ['A'],
      selectedProfile: { account: 'A', profileId: 'primary' },
      selectedAddress: 'A',
      chainId: 'dusk:3',
      explicitlyDisconnected: false,
    },
  }),
}))

vi.mock('../features/wallet/useSelectedAuthority', () => ({
  useSelectedAuthority: () => ({
    referralLookupKey: 'A',
    selectedAddress: mocks.selectedAddress,
    selectedAuthority: 'A',
    selectedContractPrincipal: null,
    selectedContractPrincipalResult: null,
    selectedTypedPrincipal: null,
    selectedTypedPrincipalKey: '',
    selectedTypedPrincipalResult: null,
  }),
}))

vi.mock('./useDuskDomainWriter', () => ({
  useDuskDomainWriter: () => Object.assign(vi.fn(), { captureWorkspace: () => () => true }),
}))

vi.mock('./useLiveWritePreflight', () => ({
  useLiveWritePreflight: () => ({
    ensureContractAuthorityForLiveWrite: vi.fn(),
    ensurePublicBalanceForLiveWrite: vi.fn(),
  }),
}))

import { useWalletRuntime } from './useWalletRuntime'

it.each(['profile', 'provider', 'generation', 'refresh failure'])('discards shielded addresses when the session changes during refresh: %s', async change => {
  const wallet = {
    state: { generation: 1, providerId: 'first', selectedProfile: { account: 'A', profileId: 'primary' } },
    requestShieldedAddress: vi.fn(async () => 'shielded-for-A'),
  }
  mocks.refreshWalletSessionState.mockImplementationOnce(async () => {
    if (change === 'provider') wallet.state.providerId = 'second'
    else if (change === 'generation') wallet.state.generation++
    else wallet.state.selectedProfile = { account: 'B', profileId: 'secondary' }
    if (change === 'refresh failure') throw new Error('offline')
    return 'connected'
  })
  let runtime!: ReturnType<typeof useWalletRuntime>
  function Probe() {
    runtime = useWalletRuntime({
      getWorkspaceToken: () => '',
      indexerClient: null,
      confirmOwnershipWrite: undefined,
      writeAccess: {},
      connectKit: {},
      connectOptions: undefined,
      liveDuskDomainsApp: null,
      runtimeConfig: { chainId: 'dusk:3', liveWritesEnabled: true, contracts: {} },
      wallet,
    } as never)
    return null
  }
  renderToStaticMarkup(createElement(Probe))

  await expect(runtime.requestSelectedShieldedAddress()).rejects.toThrow('wallet session changed')
})
