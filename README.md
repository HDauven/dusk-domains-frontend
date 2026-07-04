# Dusk Domains Frontend

Frontend app for [dusk.domains](https://dusk.domains/).

This repository contains the Vite/React app only. Protocol contracts, deployment scripts, proof tooling, the public SDK, and the production indexer live in separate repositories.

## Local Development

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill the deployed contract, indexer, node, and data-driver settings for live reads and writes.

## Runtime Boundaries

- Contract reads and writes go through `@hdauven/dusk-domains-sdk`.
- Indexed views use `VITE_DUSK_DOMAINS_INDEXER_URL`.
- Data-driver WASM files are served from `public/contracts` by default, or from explicit `VITE_DUSK_DOMAINS_*_DRIVER_URL` values.
- Local env files, mnemonics, wallet backups, and operator credentials must never be committed.

## Checks

```sh
npm run test -- --run
npm run build
```
