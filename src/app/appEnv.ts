import type { DuskNamesRuntimeEnv } from '../names/internal'

export function browserWriteProofUrlFromEnv(env: DuskNamesRuntimeEnv) {
  const preferred = env.VITE_DUSK_DOMAINS_BROWSER_WRITE_PROOF_URL
  if (typeof preferred === 'string') return preferred

  const legacy = env.VITE_DUSK_NAMES_BROWSER_WRITE_PROOF_URL
  return typeof legacy === 'string' ? legacy : undefined
}
