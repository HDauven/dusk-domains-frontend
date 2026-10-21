import type { WalletConnectionStatus } from '../features/wallet/walletStatus'

// Mainnet (dusk:1) and testnet (dusk:2) are separate sites, dusk.domains and testnet.dusk.domains.
// VITE_DUSK_DOMAINS_OTHER_NETWORK_URL names the other one; pages link to the same page there.

export type OtherNetwork = {
  /** The other site's URL, as configured. */
  href: string
  /** Its host, such as testnet.dusk.domains. */
  host: string
  label: 'Mainnet' | 'Testnet'
  chainId: 'dusk:1' | 'dusk:2'
}

/** This site's network, and the other network's site when one is configured. */
export type NetworkSites = { chainId: string, other: OtherNetwork | null }

const labels: Record<string, string> = { 'dusk:0': 'Local', 'dusk:1': 'Mainnet', 'dusk:2': 'Testnet', 'dusk:3': 'Devnet' }

export function networkLabel(chainId: string) {
  return labels[chainId] ?? 'Testnet'
}

export function otherNetwork(env: Record<string, string | boolean | undefined>): OtherNetwork | null {
  const href = String(env.VITE_DUSK_DOMAINS_OTHER_NETWORK_URL || '').trim()
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const mainnet = env.VITE_DUSK_DOMAINS_CHAIN_ID === 'dusk:1'
  return { href, host: url.host, label: mainnet ? 'Testnet' : 'Mainnet', chainId: mainnet ? 'dusk:2' : 'dusk:1' }
}

/** The page at `page`, its path, query and hash, on the site at `site`. */
export function samePageOn(site: string, page: string) {
  const url = new URL(site)
  const { pathname, search, hash } = new URL(page, 'http://page.invalid')
  url.pathname = `${url.pathname.replace(/\/+$/, '')}${pathname}`
  url.search = search
  url.hash = hash
  return url.href
}

export type WalletNetworkMismatch = {
  /** The wallet's chain, as it reports it. */
  walletChainId: string
  /** The wallet's network when it is mainnet or testnet, else null. */
  walletNetwork: string | null
  /** This site's network, which the wallet can switch to. */
  siteNetwork: string
  /** The same page on the other network's site, when the wallet is on that network. */
  otherSite: { href: string, host: string } | null
}

/** Whether a connected wallet is on another network than this site's, and which one. */
export function walletNetworkMismatch({ sites, page, walletChainId, walletStatus }: {
  sites: NetworkSites
  page: string
  walletChainId: string | null | undefined
  walletStatus: WalletConnectionStatus
}): WalletNetworkMismatch | null {
  if (walletStatus !== 'wrong-network') return null
  const chain = (walletChainId ?? '').trim().toLowerCase()
  const known = chain !== sites.chainId && (chain === 'dusk:1' || chain === 'dusk:2')
  return {
    walletChainId: chain,
    walletNetwork: known ? networkLabel(chain) : null,
    siteNetwork: networkLabel(sites.chainId),
    otherSite: sites.other && chain === sites.other.chainId ? { href: samePageOn(sites.other.href, page), host: sites.other.host } : null,
  }
}
