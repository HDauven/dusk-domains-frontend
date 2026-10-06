export function otherNetwork(env: Record<string, string | boolean | undefined>) {
  const href = String(env.VITE_DUSK_DOMAINS_OTHER_NETWORK_URL || '').trim()
  return href ? { href, label: env.VITE_DUSK_DOMAINS_CHAIN_ID === 'dusk:1' ? 'Testnet' : 'Mainnet' } : null
}
