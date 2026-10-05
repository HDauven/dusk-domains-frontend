import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { injectStaticShell, staticShellFile } from './src/app/staticShellHtml'

// index.html shows the home page's first render until the app mounts over it.
function staticShell(): Plugin {
  let root = process.cwd()
  return {
    name: 'dusk-domains-static-shell',
    configResolved(config) {
      root = config.root
    },
    transformIndexHtml(html) {
      return injectStaticShell(html, readFileSync(resolve(root, staticShellFile), 'utf8'))
    },
  }
}

// DUSK_DOMAINS_DEV_PROXY=https://dusk.domains serves the indexer API and data drivers from a live
// deployment, so `npm run dev:testnet` shows real names without a local node or indexer.
export default defineConfig(({ mode }) => {
  const target = loadEnv(mode, process.cwd(), '').DUSK_DOMAINS_DEV_PROXY
  const proxy = target
    ? Object.fromEntries(['/api', '/contracts/deployments'].map((path) => [path, { target, changeOrigin: true }]))
    : undefined
  return {
    plugins: [react(), staticShell()],
    server: { proxy },
  }
})
