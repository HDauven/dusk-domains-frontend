# Dusk Domains Frontend

React/Vite app for searching, registering, renewing and managing `.dusk` names,
with marketplace sales, auctions, offers and claims. Dusk Connect supplies wallet
access; the SDK handles contract calls and the indexer supplies discovery/history.

## Run and test

Use Node 24 and npm. From this repository's root:

```sh
npm ci
cp .env.example .env.local
npm run dev -- --host 127.0.0.1 --port 5217 --strictPort
```

Fill [.env.local using the template](.env.example) with the deployed router, core,
treasury and marketplace IDs, matching drivers, node/chain and indexer URL.
`VITE_DUSK_DOMAINS_ENABLE_LIVE_WRITES` enables wallet transactions when the runtime
is configured. Live writes require Dusk Wallet and browser-accessible node endpoints.
Support/abuse/security/status URLs are optional; unset links are hidden.

```sh
npm test
npm run build
npm run lint
```

Tests include checking npm commands in tracked Markdown. With Vite running and
Playwright Chromium installed, run the browser regressions:

```sh
DUSK_DOMAINS_E2E_BASE_URL=http://127.0.0.1:5217/ node scripts/ux-regression-smoke.mjs
```

## Deploy

`npm run build` produces static files in `dist/`. Serve driver files as Wasm and
configure the indexer's allowed browser origin to match the app.

Fall back to `index.html` for app routes. For link previews, Caddy rewrites known
preview bots visiting `/name/*` to `/api/share/name/*` before that fallback; other
visitors receive the SPA. Use the [indexer's Caddy configuration](https://github.com/HDauven/dusk-domains-indexer/blob/main/deploy/README.md#app-and-link-previews-on-duskdomains),
including `Vary: User-Agent`. The indexer also serves the PNG cards under `/api/share/name/*.png`.

## Product behavior

Reservation secrets are saved in this browser before wallet approval. Reopen the
name in Search or My Domains to recover an interrupted registration. Forgetting
removes its local secret; it does not cancel a submitted transaction.

Projection reads require healthy indexer status. A wallet-confirmed transaction
can precede finalized indexing; synchronization status distinguishes the two.
Owner/subname lists use bounded complete-set reads. Marketplace and activity lists
provide Load more. Issued reserved names have normal owner controls; the SDK's
`saleLocked` profile metadata is not enforced as a sale lock by this app.

Healthy pause status is polled every ten seconds. The app disables affected
registration/trading actions and keeps claims, refunds, settlement and ordinary
name management available. Contracts enforce pause permissions independently.

## Documentation

- [Design direction](docs/design.md): Afterglow type, colour, motion and copy rules
- [Feature organization](src/features/README.md) and [SDK boundary](src/names/README.md)
- [SDK APIs and integration examples](https://github.com/HDauven/dusk-domains-sdk/blob/main/README.md)
- [Contract semantics and permissions](https://github.com/HDauven/dusk-domains-protocol/blob/main/README.md)
- [Indexer HTTP contract and configuration](https://github.com/HDauven/dusk-domains-indexer/blob/main/docs/indexer-api.md)
