import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { parseEnv } from 'node:util'

const env = parseEnv(readFileSync(process.argv[2], 'utf8'))
for (const role of ['DIRECTORY', 'POLICY', 'STORE', 'VAULT', 'RESOLVER', 'MARKETPLACE']) {
  const key = `VITE_DUSK_DOMAINS_${role}_CONTRACT_ID`
  if (!/^(?:0x)?[\da-f]{64}$/i.test(env[key] || '') || /^(?:0x)?0+$/.test(env[key])) throw new Error(`Set ${key} to the deployed contract ID`)
  const driverKey = `VITE_DUSK_DOMAINS_${role}_DRIVER_URL`
  const url = env[driverKey] || ''
  const artifactRole = { RESOLVER: 'frozen-resolver', MARKETPLACE: 'marketplace-v1' }[role] ?? role.toLowerCase()
  const match = new RegExp(`^/contracts/dusk-domains-${artifactRole}\\.([a-f0-9]{64})\\.data-driver\\.wasm$`, 'i').exec(url)
  if (!match) throw new Error(`${driverKey} must be the immutable driver URL from frontend.env`)
  const digest = createHash('sha256').update(readFileSync(`public${url}`)).digest('hex')
  if (digest !== match[1].toLowerCase()) throw new Error(`Driver checksum mismatch: ${url}`)
}
