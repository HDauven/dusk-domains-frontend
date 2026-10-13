import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname } from 'node:path'
import { parseEnv } from 'node:util'
// The site's own reading of its env, so validation judges the env file as the build will.
import { isProductionChain, runtimeChainId, runtimeEnvValue } from '../src/names/runtimeEnv.js'

const env = parseEnv(readFileSync(process.argv[2], 'utf8'))
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const normalized = id => String(id ?? '').toLowerCase().replace(/^0x/, '')
const pinned = {}
for (const role of ['DIRECTORY', 'POLICY', 'STORE', 'VAULT', 'RESOLVER', 'MARKETPLACE']) {
  const key = `VITE_DUSK_DOMAINS_${role}_CONTRACT_ID`
  if (!/^(?:0x)?[\da-f]{64}$/i.test(env[key] || '') || /^(?:0x)?0+$/.test(env[key])) throw new Error(`Set ${key} to the deployed contract ID`)
  const driverKey = `VITE_DUSK_DOMAINS_${role}_DRIVER_URL`
  const url = env[driverKey] || ''
  const artifactRole = { RESOLVER: 'frozen-resolver', MARKETPLACE: 'marketplace-v1' }[role] ?? role.toLowerCase()
  const match = new RegExp(`^/contracts/dusk-domains-${artifactRole}\\.([a-f0-9]{64})\\.data-driver\\.wasm$`, 'i').exec(url)
  if (!match) throw new Error(`${driverKey} must be the immutable driver URL from frontend.env`)
  const digest = sha256(`public${url}`)
  if (digest !== match[1].toLowerCase()) throw new Error(`Driver checksum mismatch: ${url}`)
  pinned[role.toLowerCase()] = { id: normalized(env[key]), sha256: digest }
}

// The reviewed manifest lists every contract the site may follow, also those admitted after launch.
// A mainnet or testnet site follows governance through it, so every deploy serves one at
// /manifest.json, given with --manifest. Only a local or dev chain may deploy without one, and only
// when its env file says so with DUSK_DOMAINS_DEPLOY_WITHOUT_MANIFEST=true. The app refuses a manifest
// that leaves out a configured contract or uses a driver its role doesn't pin, so it is checked here
// before anything is uploaded.
const manifestUrl = runtimeEnvValue(env, 'MANIFEST_URL')
const chainId = runtimeChainId(env)
const production = isProductionChain(chainId)
const withoutManifest = String(env.DUSK_DOMAINS_DEPLOY_WITHOUT_MANIFEST ?? '').trim() === 'true'
if (withoutManifest && production)
  throw new Error(`DUSK_DOMAINS_DEPLOY_WITHOUT_MANIFEST is for local chains only: this site builds for ${chainId}, which needs its manifest.`)
if (withoutManifest && (manifestUrl || existsSync('public/manifest.json')))
  throw new Error('DUSK_DOMAINS_DEPLOY_WITHOUT_MANIFEST is set, but this deploy names or was given a manifest.')
if (!withoutManifest) {
  if (!manifestUrl)
    throw new Error('Set VITE_DUSK_DOMAINS_MANIFEST_URL=/manifest.json and give the network’s manifest with --manifest.')
  if (manifestUrl !== '/manifest.json')
    throw new Error(`VITE_DUSK_DOMAINS_MANIFEST_URL must be /manifest.json, the manifest this deploy serves, not ${manifestUrl}.`)
  // deploy.sh says whether --manifest gave one: a manifest tracked in the repository is never served in its place.
  if (production && process.env.DUSK_DOMAINS_DEPLOY_MANIFEST_GIVEN !== 'true')
    throw new Error(`A ${chainId} deploy gives the network’s reviewed manifest with --manifest.`)
  const file = `public${manifestUrl}`
  if (!existsSync(file)) throw new Error(`VITE_DUSK_DOMAINS_MANIFEST_URL names ${manifestUrl}, but this deploy has no manifest. Give it with --manifest.`)
  const manifest = JSON.parse(readFileSync(file, 'utf8'))
  if (manifest.chainId !== chainId)
    throw new Error(`The manifest is for ${manifest.chainId}, not ${chainId}`)
  // The deploy tool's handoff, or the SDK's format for releases with several implementations of a role.
  const entries = manifest.schema === 'dusk-domains/frozen-release/v1'
    ? (manifest.contracts ?? []).map(c => ({ role: c.key, id: normalized(c.id), driver: manifest.artifacts?.[c.key]?.driver ?? {} }))
    : (manifest.contracts ?? []).map(c => ({ role: c.role, id: normalized(c.contractId), driver: c.dataDriver ?? {} }))
  for (const [role, configured] of Object.entries(pinned)) {
    if (!entries.some(entry => entry.role === role && entry.id === configured.id))
      throw new Error(`The manifest doesn't list the configured ${role} contract`)
  }
  for (const entry of entries) {
    const role = pinned[entry.role]
    if (!role || String(entry.driver.sha256).toLowerCase() !== role.sha256)
      throw new Error(`The manifest's ${entry.role} contract 0x${entry.id} uses a driver this build doesn't pin. A new driver needs a rebuild with new pins.`)
    const path = `${dirname(file)}/${entry.driver.path}`
    if (!existsSync(path) || sha256(path) !== role.sha256)
      throw new Error(`The manifest's ${entry.role} driver ${entry.driver.path} is missing or changed`)
  }
}
