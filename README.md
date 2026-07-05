# Dusk Domains Frontend

React/Vite frontend for [dusk.domains](https://dusk.domains/).

The app lets users search, reserve, register and manage `.dusk` domains. It uses Dusk Connect for wallet access, the Dusk Domains SDK for contract reads/writes and the Dusk Domains indexer for search, history and dashboard views.

## Requirements

- Node.js 22+
- npm
- Dusk Wallet browser extension for live writes
- Dusk Domains core and treasury contract IDs
- Dusk Domains indexer URL
- Core and treasury data-driver WASM URLs

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with the deployed contracts, node URL, indexer URL and data-driver URLs.

## Environment

The app reads `VITE_DUSK_DOMAINS_*` variables.

Required for live mode:

```text
VITE_DUSK_DOMAINS_NODE_URL
VITE_DUSK_DOMAINS_CHAIN_ID
VITE_DUSK_DOMAINS_CORE_CONTRACT_ID
VITE_DUSK_DOMAINS_TREASURY_CONTRACT_ID
VITE_DUSK_DOMAINS_CORE_DRIVER_URL
VITE_DUSK_DOMAINS_TREASURY_DRIVER_URL
VITE_DUSK_DOMAINS_INDEXER_URL
VITE_DUSK_DOMAINS_ENABLE_LIVE_WRITES=true
```

Optional product links:

```text
VITE_DUSK_DOMAINS_SUPPORT_URL
VITE_DUSK_DOMAINS_ABUSE_URL
VITE_DUSK_DOMAINS_SECURITY_URL
VITE_DUSK_DOMAINS_STATUS_URL
```

Never commit filled env files, mnemonics, wallet backups or operator credentials.

## Scripts

```bash
npm run dev       # start Vite
npm run build     # typecheck and build
npm run preview   # serve the production build locally
npm run test      # run Vitest
npm run lint      # run ESLint
npm run check     # test and build
```

## Source Layout

```text
src/
  app/          app composition, runtime state and adapters
  components/   reusable UI, wallet, brand and status components
  features/     search, registration, domains, treasury, referrals and activity views
  names/        thin re-export boundary to @duskdomains/sdk and first-party SDK helpers
  styles/       global shell, navigation, layout, notice and responsive styles
  utils/        small formatting helpers
```

Feature CSS lives next to the feature it styles. `src/App.css` only composes global styles, shared component styles and feature style bundles.

## Deployment

Build output is static:

```bash
npm run build
```

Deploy `dist/` to Cloudflare Pages or another static host. Serve data-driver WASM files with `application/wasm` when possible.

## License

MIT
