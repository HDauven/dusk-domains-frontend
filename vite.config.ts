import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// DUSK_DOMAINS_DEV_PROXY=https://dusk.domains serves the indexer API and data drivers from a live
// deployment, so `npm run dev:testnet` shows real names without a local node or indexer.
export default defineConfig(({ mode }) => {
  const target = loadEnv(mode, process.cwd(), '').DUSK_DOMAINS_DEV_PROXY
  const proxy = target
    ? Object.fromEntries(['/api', '/contracts/deployments'].map((path) => [path, { target, changeOrigin: true }]))
    : undefined
  return {
    plugins: [react()],
    server: { proxy },
  }
})
