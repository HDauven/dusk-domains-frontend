# Dusk Domains Frontend

React/Vite frontend for [dusk.domains](https://dusk.domains/).

The app lets users search, reserve, register and manage `.dusk` domains. It uses Dusk Connect for wallet access, the Dusk Domains SDK for contract reads/writes and the Dusk Domains indexer for search, history and dashboard views.

## Requirements

- Node.js 22+
- npm
- Dusk Wallet browser extension for live writes
- Dusk Domains core, treasury and marketplace contract IDs
- Dusk Domains indexer URL
- Core, treasury and marketplace data-driver WASM URLs

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
VITE_DUSK_DOMAINS_ROUTER_CONTRACT_ID
VITE_DUSK_DOMAINS_CORE_CONTRACT_ID
VITE_DUSK_DOMAINS_TREASURY_CONTRACT_ID
VITE_DUSK_DOMAINS_MARKETPLACE_CONTRACT_ID
VITE_DUSK_DOMAINS_ROUTER_DRIVER_URL
VITE_DUSK_DOMAINS_CORE_DRIVER_URL
VITE_DUSK_DOMAINS_TREASURY_DRIVER_URL
VITE_DUSK_DOMAINS_MARKETPLACE_DRIVER_URL
VITE_DUSK_DOMAINS_INDEXER_URL
VITE_DUSK_DOMAINS_ENABLE_LIVE_WRITES=true
```

Projection reads require a reachable indexer reporting `health.ok: true`. Indexer
fetches time out after 10 seconds each; multi-request reads and confirmation retries
can take longer. A confirmed wallet transaction may precede finalized indexing:
wait for synchronization or refresh the data rather than resubmitting it.

The node endpoint must accept browser requests from the frontend origin. A raw
`rusk-private` endpoint may need a local CORS proxy for browser-based contract
reads; hosted Dusk node endpoints should expose the required CORS headers.

Optional product links:

```text
VITE_DUSK_DOMAINS_SUPPORT_URL
VITE_DUSK_DOMAINS_ABUSE_URL
VITE_DUSK_DOMAINS_SECURITY_URL
VITE_DUSK_DOMAINS_STATUS_URL
```

Never commit filled env files, mnemonics, wallet backups or operator credentials.

## Registration recovery

The reservation secret is saved in this browser before wallet approval. After an
interruption, reopen the name in Search or My Domains and check its status before
retrying. Unconfirmed, rejected and expired requests remain saved until explicitly
forgotten. Forgetting deletes the local recovery secret; it does not cancel a
submitted transaction. Keep browser storage enabled and retain it until the
registration is resolved.

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

## Referral validation bundle cost

Measured with `npm run build` on 2026-10-01 (Node 24.13.0, Vite 8.1.3), using
the SDK worktree copied into `node_modules/@duskdomains/sdk`. The SDK archive pin
in `package.json` and `package-lock.json` is unchanged. Noble curves and hashes
2.4.0 were copied from the SDK's installed dependencies for all three builds.
The baseline restores frontend `91d4f29` and SDK `2a71a06` sources; the eager
comparison uses the reviewed `fa2d4e9` / `bb6adea` sources.

| Build | Main JS | Main gzip | Deferred BLS gzip |
| --- | ---: | ---: | ---: |
| Before referral validation | 626.18 KB | 170.76 KB | — |
| Eager full validation | 697.40 KB | 197.47 KB | — |
| Lazy full input validation, synchronous encoding | 631.56 KB | 172.85 KB | 24.28 KB |

The eager change adds 26.71 KB gzip, above the 15 KB threshold. Full BLS validation
now loads on the Moonlight referral path. Empty attribution, contracts and Phoenix
skip the import. The remaining main-chunk increase is 2.09 KB gzip, including
structural checks, loading and async input state handling; BLS lives in its own chunk.
CSS stays at 11.98 KB gzip. There is no other BLS implementation in the frontend's
production dependencies to reuse (`@dusk/connect` has no dependencies;
`@noble/hashes` only supplies hashing).

Referrals remain inactive while validation is pending. Clearing or changing input
cancels the old result, including its storage write. A failed module load leaves
attribution inactive. The browser smoke covers lazy loading, pending and cleared
input, and rejection of off-curve and out-of-subgroup keys.

`referralStateFromInput` awaits the SDK's full `isClaimableReferrer` validation at
the referral input. Registration builders and encoding stay synchronous and use
`hasClaimableReferrerShape`, the cheap contract-equivalent structural check.

For worktree development after `npm ci`, copy the SDK's `src/` and `package.json`
into `node_modules/@duskdomains/sdk/`, and its `node_modules/@noble/` packages into
the frontend's `node_modules/@noble/`. Restart Vite with a cleared local dependency
cache after replacing SDK sources. Do not change the archive pin for this workflow.

## License

MIT

## Issued reserved names

Search trusts the indexer's registered status for issued reserved names and shows the owner and normal profile. Unissued and released protected labels remain reserved. There is no operator issuance UI.

The SDK's official profiles carry `saleLocked: true` policy metadata. This frontend does not enforce that flag; issued names use the ordinary owner and marketplace controls. The contracts do not lock sales. The SDK archive pin is unchanged.

## Paginated indexer reads

My Domains and marketplace name selection use `getAllNames({ owner })`, with the
SDK's 10,000-item ceiling and an explicit error on overflow. Empty owner results
no longer trigger a global namespace scan. Subname management uses the same
capped traversal through `getAllSubnames`; record hydration uses four concurrent
workers and reports child read failures. A healthy indexer check is reused for
five seconds, with concurrent checks sharing one request. Explicit health reads
remain fresh for confirmation polling.

Marketplace Browse, Yours, and Offers load one page per collection and share a
Load more control. Name activity and auction activity have their own Load more
controls. Refresh starts from the first page; pending continuations are ignored
after a refresh or name switch, as are stale initial hydration results. Tab
switches preserve loaded marketplace pages. A real reload re-fetches an open
auction separately when it falls outside page one. The decorative name sky
intentionally samples only the first name page; search remains a single availability lookup. Treasury
and referral views keep their existing bounded histories.

The browser smoke counts 49 indexer requests for home (3), search (6), opening a
name with 20 subnames (27), opening the marketplace with two wallet owner keys
(7), and paging all three collections twice (6). This fixture session runs within
one health-cache interval; slower sessions may need additional health checks.
The production default is 200 requests per client budget per 60 seconds. Searching
and hydrating a name with 60 children takes 67 requests, with all children read.

The SDK archive pin is unchanged. To test this change before a separately
approved SDK pin update, run `npm ci`, then copy the SDK worktree's `src` directory
and `package.json` into `node_modules/@duskdomains/sdk/` before the frontend checks.
The new pagination methods require that updated SDK at build time.
