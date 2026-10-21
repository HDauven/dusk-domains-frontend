import { expect, it } from 'vitest'
import { otherNetwork, samePageOn, walletNetworkMismatch, type NetworkSites } from './otherNetwork'

it('names the other network from this site\'s chain', () => {
  expect(otherNetwork({ VITE_DUSK_DOMAINS_CHAIN_ID: 'dusk:1', VITE_DUSK_DOMAINS_OTHER_NETWORK_URL: 'https://testnet.dusk.domains' }))
    .toEqual({ href: 'https://testnet.dusk.domains', host: 'testnet.dusk.domains', label: 'Testnet', chainId: 'dusk:2' })
  expect(otherNetwork({ VITE_DUSK_DOMAINS_CHAIN_ID: 'dusk:2', VITE_DUSK_DOMAINS_OTHER_NETWORK_URL: 'https://dusk.domains' }))
    .toEqual({ href: 'https://dusk.domains', host: 'dusk.domains', label: 'Mainnet', chainId: 'dusk:1' })
})

it('has no other network without a usable URL', () => {
  for (const url of [undefined, '', '  ', 'dusk.domains', 'javascript:alert(1)', 'mailto:support@dusk.domains']) {
    expect(otherNetwork({ VITE_DUSK_DOMAINS_CHAIN_ID: 'dusk:1', VITE_DUSK_DOMAINS_OTHER_NETWORK_URL: url })).toBeNull()
  }
})

it('links to the same page, query and hash on the other site', () => {
  expect(samePageOn('https://testnet.dusk.domains', '/')).toBe('https://testnet.dusk.domains/')
  expect(samePageOn('https://testnet.dusk.domains/', '/name/foo.dusk')).toBe('https://testnet.dusk.domains/name/foo.dusk')
  expect(samePageOn('https://dusk.domains', '/search?q=foo#results')).toBe('https://dusk.domains/search?q=foo#results')
  // A page path never moves the link to another host.
  expect(samePageOn('https://dusk.domains', '//evil.example/x')).toBe('https://dusk.domains/x')
})

const mainnet: NetworkSites = { chainId: 'dusk:1', other: { href: 'https://testnet.dusk.domains', host: 'testnet.dusk.domains', label: 'Testnet', chainId: 'dusk:2' } }

it('shows no banner unless the wallet is on another network', () => {
  for (const walletStatus of ['detecting', 'missing', 'disconnected', 'locked', 'connected'] as const) {
    expect(walletNetworkMismatch({ sites: mainnet, page: '/', walletChainId: 'dusk:2', walletStatus })).toBeNull()
  }
})

it('offers the same page on the wallet\'s network site, and the switch back', () => {
  expect(walletNetworkMismatch({ sites: mainnet, page: '/name/foo.dusk', walletChainId: 'dusk:2', walletStatus: 'wrong-network' })).toEqual({
    walletChainId: 'dusk:2',
    walletNetwork: 'Testnet',
    siteNetwork: 'Mainnet',
    otherSite: { href: 'https://testnet.dusk.domains/name/foo.dusk', host: 'testnet.dusk.domains' },
  })
})

it('offers only the switch for a network without a site', () => {
  expect(walletNetworkMismatch({ sites: mainnet, page: '/', walletChainId: 'dusk:3', walletStatus: 'wrong-network' }))
    .toEqual({ walletChainId: 'dusk:3', walletNetwork: null, siteNetwork: 'Mainnet', otherSite: null })
  expect(walletNetworkMismatch({ sites: { chainId: 'dusk:1', other: null }, page: '/', walletChainId: 'dusk:2', walletStatus: 'wrong-network' }))
    .toEqual({ walletChainId: 'dusk:2', walletNetwork: 'Testnet', siteNetwork: 'Mainnet', otherSite: null })
})
