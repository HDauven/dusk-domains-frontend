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

Fill [.env.local using the template](.env.example) with the six deployed contract IDs
(directory, policy, store, vault, resolver and marketplace), their pinned driver URLs,
the node, chain and indexer URL, and for a production site the deployment manifest URL and
the read lens's ID and driver URL.
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

Use the [mainnet and testnet deployment guide](docs/deploy.md) for env files,
repeatable deploys and rollback. `npm run build` produces static files in `dist/`.
Serve driver files as Wasm and configure the indexer's allowed browser origin
to match the app.

Fall back to `index.html` for app routes. For link previews, Caddy rewrites known
preview bots visiting `/name/*` to `/api/share/name/*` before that fallback; other
visitors receive the SPA. Use the [indexer's Caddy configuration](https://github.com/HDauven/dusk-domains-indexer/blob/main/deploy/README.md#app-and-link-previews-on-duskdomains),
including `Vary: User-Agent`. The indexer also serves the PNG cards under `/api/share/name/*.png`.

## Product behavior

Reservation secrets are saved in this browser before wallet approval. Reopen the
name in Search or My Domains to recover an interrupted registration. Forgetting
removes its local secret; it does not cancel a submitted transaction.

A reservation keeps the price it was made at with it. If a governance policy change
reprices it, the reservation stays valid: Register shows the old and new price and
registers the same reservation once the new price is confirmed. Renewals follow the
separate renewal schedule. See [registration price changes](docs/deploy.md#registration-price-changes).

Projection reads require healthy status from an indexer that reports this site's
network and contracts in a complete, conflict-free deployment record; any other indexer
counts as unhealthy. While the
indexer's collector is blocked or catching up, and nothing else is wrong, the indexer keeps
serving its last complete publication: the site shows it, says name data stopped updating
at that block (or is catching up), and pauses the write confirmations that wait for the
indexer to reach the transaction's block. Any other unhealthy status shows no indexed data. A
wallet-confirmed transaction can precede finalized indexing; synchronization status
distinguishes the two.
Owner/subname lists use bounded complete-set reads. Marketplace and activity lists
provide Load more. Issued reserved names have normal owner controls; the SDK's
`saleLocked` profile metadata is not enforced as a sale lock by this app.

Auction reviews retain the placement ID and chosen bid amount. Canonical reads
verify that ID and immutable terms before signing. The review shows the current
highest bid and end time as information; intervening bids do not block submission.
The contract checks the chosen amount against the current minimum and applies
bounded late-bid extensions.

The app reads the pause from the indexer's status every minute, and checks the
directory's registration context before every quote, reservation and registration.
While registrations are paused it reads no registration quotes, disables reservations
and registrations, and says when each saved reservation expires: a reservation still
expires 8,640 blocks (about a day) after it was made. Claims, refunds, settlement,
renewals and ordinary name management stay available. Contracts enforce pause
permissions independently.

New listings and offers go to the market the directory prefers now, which the app
reads again every three minutes and after each confirmed write. Existing orders keep the
market they were placed at and are acted on only there; an order listed without its market
and order can't be acted on. The market, My names and the name page list orders and refunds
in every market the directory admitted, so a market that is draining, or no longer
preferred, still lets its orders be bought, settled, cancelled or returned and its refunds
withdrawn, each from that market. A market that is paused, draining or retired, or whose
deployment or configuration the indexer hasn't authenticated, takes no new bid; while the
preferred market's fee is unknown, the site shows it as unknown and takes no new listing or
offer. Before a new order or bid is signed, the market's own config and the directory's record
of it are read from the chain. Anyone can renew a listed name: the renewal goes through its
market with the reviewed order, which the chain refuses once the name has left that listing,
and leaves the listing, its escrow and its records as they are. Any other name renews through
its store, after a check that its owner is still the one reviewed. The store doesn't bind the
owner, so a name that changes hands between that check and execution is renewed for its new
owner.

A Dusk address has one primary name, kept by the shard its name lives in. A name becomes the primary
name of the Dusk address its own record holds, set from that address's wallet by the name's owner or
manager while it hasn't expired and isn't being moved. The site reads all of this from the chain
before any wallet request, and again before each one, and otherwise says why and sends nothing. A
shard sets a new primary name only while no other shard keeps a link for the address, even one that
no longer resolves, and only the address's own wallet can clear a link. Making a name in another
shard primary therefore takes two wallet approvals: the site names both names, clears the current
link in its shard first, then sets the new name once the chain has confirmed the clear. A
registration sets its name as primary only when no other shard keeps a link.

Only record keys this app knows get a label or a link. Any other key is shown exactly,
with invisible characters spelled out, and marked as a custom record. An address the
indexer reports invalid, or that fails the SDK's validation, is never offered as a
payment target, nor shown or copied as anyone's Dusk address. Long records show their
first lines until expanded.

After a failed client creation, or once the client refuses a contract, the app discards the
client and its release and builds a fresh one on the next read, so a fixed manifest
takes effect without a reload.

When the release has a read lens, a name's page, a primary name, a registration price and the
directory's state each take one contract query, however many stores the directory admits; anything
the lens can't answer is read directly. Reads start at the store the indexer names as a name's home.
The parts of a page share what they read from the chain at one block height: they take the name from
the page's read while the tip stays at its height, and reads repeated at one height reach the node
once. A contract's interface, binding and market order API never change, so the tab keeps what
verification read for its session; signing for a contract reads it from the chain again.

## Documentation

- [Design direction](docs/design.md): Afterglow type, colour, motion and copy rules
- [Feature organization](src/features/README.md) and [SDK boundary](src/names/README.md)
- [SDK APIs and integration examples](https://github.com/HDauven/dusk-domains-sdk/blob/main/README.md)
- [Contract semantics and permissions](https://github.com/HDauven/dusk-domains-protocol/blob/main/README.md)
- [Indexer HTTP contract and configuration](https://github.com/HDauven/dusk-domains-indexer/blob/main/docs/indexer-api.md)
