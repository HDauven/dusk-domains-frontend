import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { expect, it } from 'vitest'

it.each(['mainnet', 'testnet'])('documents every production setting for %s', (network) => {
  const env = parseEnv(readFileSync(`.env.${network}.example`, 'utf8'))
  const mainnet = network === 'mainnet'
  expect(env).toMatchObject({
    VITE_DUSK_DOMAINS_CHAIN_ID: mainnet ? 'dusk:1' : 'dusk:2',
    VITE_DUSK_DOMAINS_NODE_URL: mainnet ? 'https://nodes.dusk.network' : 'https://testnet.nodes.dusk.network',
    VITE_DUSK_DOMAINS_SITE_URL: mainnet ? 'https://dusk.domains' : 'https://testnet.dusk.domains',
    VITE_DUSK_DOMAINS_OTHER_NETWORK_URL: mainnet ? 'https://testnet.dusk.domains' : 'https://dusk.domains',
    VITE_DUSK_DOMAINS_NOINDEX: String(!mainnet),
    VITE_DUSK_DOMAINS_INDEXER_URL: '/api',
    VITE_DUSK_DOMAINS_ENABLE_LIVE_WRITES: 'true',
    VITE_DUSK_DOMAINS_ENABLE_REFERRAL_ATTRIBUTION: 'true',
    VITE_DUSK_DOMAINS_ENABLE_REFERRAL_CLAIMS: 'true',
    VITE_DUSK_DOMAINS_ENABLE_MARKETPLACE: 'true',
    VITE_DUSK_DOMAINS_SUPPORT_URL: 'https://github.com/HDauven/dusk-domains-frontend/issues/new?template=support-request.yml',
    VITE_DUSK_DOMAINS_ABUSE_URL: 'https://github.com/HDauven/dusk-domains-frontend/issues/new?template=abuse-report.yml',
    VITE_DUSK_DOMAINS_SECURITY_URL: 'https://github.com/HDauven/dusk-domains-frontend/security/advisories/new',
    VITE_DUSK_DOMAINS_STATUS_URL: '',
  })
  for (const role of ['DIRECTORY', 'POLICY', 'STORE', 'VAULT', 'RESOLVER', 'MARKETPLACE']) {
    expect(env[`VITE_DUSK_DOMAINS_${role}_CONTRACT_ID`]).toMatch(/^<.+>$/)
    expect(env[`VITE_DUSK_DOMAINS_${role}_DRIVER_URL`]).toBe(`/contracts/dusk-domains-${role.toLowerCase()}.<sha256>.data-driver.wasm`)
  }
})

it('keeps the testnet dev shortcut on the testnet site and env mode', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  expect(pkg.scripts['dev:testnet']).toBe('DUSK_DOMAINS_DEV_PROXY=https://testnet.dusk.domains vite --mode testnet')
})
