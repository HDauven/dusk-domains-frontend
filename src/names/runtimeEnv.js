// How the site reads its VITE_ env. Deploy validation (scripts/validate-deploy.mjs) imports this file
// too, so it judges an env file exactly as the built site will read it. Plain JavaScript without
// imports, so Node loads it directly wherever a deploy builds. Types: runtimeEnv.d.ts.

/** An env value as the site reads it: a string, trimmed. */
export function runtimeEnvValue(env, key) {
  return String(env[`VITE_DUSK_DOMAINS_${key}`] ?? '').trim()
}

/** The chain the site runs on: dusk:0 to dusk:3, and testnet's dusk:2 for anything else. */
export function runtimeChainId(env) {
  const chainId = runtimeEnvValue(env, 'CHAIN_ID')
  return /^dusk:[0-3]$/.test(chainId) ? chainId : 'dusk:2'
}

/** Mainnet (dusk:1) and testnet (dusk:2), which follow governance through a deployed manifest. */
export function isProductionChain(chainId) {
  return chainId === 'dusk:1' || chainId === 'dusk:2'
}
