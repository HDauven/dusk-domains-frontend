import { useEffect } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Panel } from '../../components/ui/Panel'
import { CopyValue } from '../../components/ui/CopyValue'
import { updatePageMetadata } from '../../app/pageMetadata'
import { manifestFromConfig, roles, isPlaceholderContractId, type DuskDomainsRuntimeConfig } from '../../names/internal'
import { NAME_CONTROL_SUMMARY } from '../trust/trustCopy'
import { developerLinks } from './developerLinks'
import './styles.css'

const roleLabels: Record<(typeof roles)[number], string> = {
  directory: 'Directory',
  policy: 'Registration policy',
  store: 'Name store',
  vault: 'Vault (fees)',
  resolver: 'Resolver (records)',
  marketplace: 'Marketplace',
}

function networkName(chainId: string) {
  return chainId === 'dusk:1' ? 'Mainnet' : chainId === 'dusk:0' ? 'Local' : chainId === 'dusk:3' ? 'Devnet' : 'Testnet'
}

function manifestJson(runtimeConfig: DuskDomainsRuntimeConfig, origin: string) {
  try { return JSON.stringify(manifestFromConfig(runtimeConfig, origin), null, 2) } catch { return '' }
}

// How the example gets a client for what this site publishes. A manifest URL can serve the deploy
// tool's handoff (contracts by key and id, drivers under artifacts), which the SDK only reads as
// role, contractId and dataDriver, so the example converts it as the app does; an SDK manifest
// passes through. Without a manifest URL, the page lists one built from this site's configuration.
function sdkLoader(runtimeConfig: DuskDomainsRuntimeConfig, origin: string, api: string, listed: boolean) {
  if (runtimeConfig.manifestUrl) return `
// A deploy tool manifest (schema dusk-domains/frozen-release/v1) needs converting to the SDK's format.
const manifestUrl = '${new URL(runtimeConfig.manifestUrl, `${origin}/`).href}'
const published = await (await fetch(manifestUrl)).json()
const manifest = published.schema === 'dusk-domains/frozen-release/v1'
  ? { ...published, contracts: published.contracts.map(contract => ({ role: contract.key, contractId: contract.id,
      codeHash: contract.codeHash, dataDriver: published.artifacts[contract.key].driver })) }
  : published
const client = await createClientFromManifest(manifest, {
  artifactBaseUrl: new URL('.', manifestUrl).href,
  nodeUrl: '${new URL(runtimeConfig.nodeUrl, `${origin}/`).href}',
  indexerUrl: '${api}',
})`
  if (listed) return `// The deployment manifest below, saved as manifest.json.
import manifest from './manifest.json' with { type: 'json' }

const client = await createClientFromManifest(manifest, { artifactBaseUrl: '${origin}/' })`
  return `
const client = await createClientFromManifest('<deployment manifest URL>')`
}

function Code({ children, label }: { children: string, label: string }) {
  return <div className="developer-code">
    <pre><code>{children}</code></pre>
    <CopyValue value={children} label={label} />
  </div>
}

// What an app needs to read .dusk names: the public API, the SDK and this network's contracts.
export function DevelopersPage({ runtimeConfig, origin }: { runtimeConfig: DuskDomainsRuntimeConfig, origin: string }) {
  useEffect(() => {
    updatePageMetadata({ title: 'Developers · Dusk Domains', description: 'Resolve .dusk names with the public API or the TypeScript SDK, and find the Dusk Domains contract IDs.', url: 'https://dusk.domains/developers' })
    return () => updatePageMetadata()
  }, [])
  const api = new URL(runtimeConfig.indexerUrl || '/api', `${origin}/`).href.replace(/\/+$/, '')
  const configured = roles.every(role => !isPlaceholderContractId(runtimeConfig.contracts[role]?.contractId ?? ''))
  const manifest = configured && !runtimeConfig.manifestUrl ? manifestJson(runtimeConfig, origin) : ''
  const sdkExample = `import { createClientFromManifest } from '@duskdomains/sdk'
${sdkLoader(runtimeConfig, origin, api, Boolean(manifest))}
const result = await client.getName('pie.dusk')
if (result.value !== 'Absent' && 'Local' in result.value) {
  const records = await client.store(result.store).read_records(result.value.Local.name.key)
  console.log(records)
}`

  return <article className="developers-page" aria-labelledby="developers-heading">
    <header>
      <h1 id="developers-heading">Developers</h1>
      <p>Read .dusk names in your app with the public API or the TypeScript SDK. Reads need no key and no wallet.</p>
    </header>

    <Panel className="developer-section" aria-labelledby="resolve-heading">
      <h2 id="resolve-heading">Resolve a name</h2>
      <p>The API returns a name's public records. Use them only when <code>verificationStatus</code> is <code>forward_resolved</code>. The Dusk address is the record with the key <code>moonlight_address</code>.</p>
      <Code label="command">{`curl '${api}/resolve?name=pie.dusk'`}</Code>
      <p>Find the primary name an address chose:</p>
      <Code label="command">{`curl '${api}/reverse?type=moonlight_address&value=<Dusk address>'`}</Code>
    </Panel>

    <Panel className="developer-section" aria-labelledby="sdk-heading">
      <h2 id="sdk-heading">Use the SDK</h2>
      <p>The SDK reads the contracts directly and checks the data drivers it loads.</p>
      <Code label="command">npx jsr add @duskdomains/sdk</Code>
      <Code label="example">{sdkExample}</Code>
      {manifest ? <details className="developer-manifest"><summary>Deployment manifest for {networkName(runtimeConfig.chainId)}</summary><Code label="manifest">{manifest}</Code></details> : null}
    </Panel>

    <Panel className="developer-section" aria-labelledby="contracts-heading">
      <h2 id="contracts-heading">Contracts on {networkName(runtimeConfig.chainId)}</h2>
      {configured ? <dl className="developer-contracts">
        {roles.map(role => <div key={role}>
          <dt>{roleLabels[role]}</dt>
          <dd><code>{runtimeConfig.contracts[role]!.contractId}</code> <CopyValue value={runtimeConfig.contracts[role]!.contractId} label={`${roleLabels[role]} contract ID`} /></dd>
        </div>)}
      </dl> : <p>This site has no contracts configured.</p>}
      <p>{NAME_CONTROL_SUMMARY}</p>
    </Panel>

    <Panel className="developer-section" aria-labelledby="links-heading">
      <h2 id="links-heading">Links</h2>
      <ul className="developer-links">
        {developerLinks.map(link => <li key={link.href}>
          <a href={link.href} {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{link.label}{link.href.startsWith('http') ? <ArrowUpRight size={14} aria-hidden="true" /> : null}</a>
          {link.note ? <code>{link.note}</code> : null}
        </li>)}
      </ul>
    </Panel>
  </article>
}
