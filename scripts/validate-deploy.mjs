import { readFileSync, statSync } from 'node:fs'
import { parseEnv } from 'node:util'

const env = parseEnv(readFileSync(process.argv[2], 'utf8'))
for (const role of ['ROUTER', 'CORE', 'TREASURY', 'MARKETPLACE']) {
  const key = `VITE_DUSK_DOMAINS_${role}_CONTRACT_ID`
  if (!/^0x[\da-f]{64}$/i.test(env[key] || '')) throw new Error(`Set ${key} to the deployed contract ID`)
}
for (const role of ['ROUTER', 'CORE', 'TREASURY', 'MARKETPLACE']) {
  const key = `VITE_DUSK_DOMAINS_${role}_DRIVER_URL`
  const url = env[key] || ''
  if (!/^\/contracts\/deployments\/[\da-f]+\/[\w-]+\.data-driver\.wasm$/i.test(url)) {
    throw new Error(`${key} must point to a hash-versioned /contracts/deployments/ driver`)
  }
  if (!statSync(`public${url}`).isFile()) throw new Error(`Missing driver: ${url}`)
}
