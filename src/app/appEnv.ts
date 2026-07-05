import type { DuskDomainsRuntimeEnv } from '../names/internal'

export function browserWriteProofUrlFromEnv(env: DuskDomainsRuntimeEnv) {
  const value = env.VITE_DUSK_DOMAINS_BROWSER_WRITE_PROOF_URL
  return typeof value === 'string' ? value : undefined
}
