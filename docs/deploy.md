# Deploy the frontend

Both sites use the same commit. Mainnet is at `https://dusk.domains` on `dusk:1`;
testnet is at `https://testnet.dusk.domains` on `dusk:2`. Use separate served
directories and indexer instances on the server. Each site's `/api` must route to
its own indexer, whose allowed browser origin matches that site.

Copy `.env.mainnet.example` to `.env.mainnet.local`, and `.env.testnet.example` to
`.env.testnet.local`. Merge that network's deploy bundle `frontend.env` into its local env file. It supplies
`VITE_DUSK_DOMAINS_{DIRECTORY,POLICY,STORE,VAULT,RESOLVER,MARKETPLACE}_{CONTRACT_ID,DRIVER_URL}`.
Copy the bundle's `contracts/` contents to `public/contracts/`; immutable filenames are
`dusk-domains-<role>.<sha256>.data-driver.wasm`, with `frozen-resolver` and `marketplace-v1`
for the resolver and marketplace. Validation checks IDs, emitted filenames and SHA-256.
Set the frontend's indexer URL for this site (for example `/api`); the local-chain handoff
may leave it empty, which deliberately keeps the app in preview mode.

If using `VITE_DUSK_DOMAINS_MANIFEST_URL=/manifest.json`, host the bundle's `manifest.json`
at the site root with `contracts/` beneath it. For a versioned URL such as
`/releases/v1/manifest.json`, host its drivers beneath `/releases/v1/contracts/`.
Driver paths are relative to the manifest directory. The app explicitly adapts the
`dusk-domains/frozen-release/v1` handoff (`contracts[].id` and `artifacts[role].driver`)
to SDK `contractId`/`dataDriver` entries. It validates the configured chain and each role's
ID, and the SDK verifies driver hashes and schemas before using them. SDK-format manifests
are also accepted for reviewed releases containing multiple admitted implementations.
The manifest must list every admitted store/resolver/market implementation the client
may follow. Publish its reviewed update before enabling a shard destination; SDK reads
verify admission, binding, driver checksum and monotone forwarding. New name actions resolve
the current home; saved reservations retain their original commitment store. Existing marketplace
orders retain their marketplace, order ID and original store, including cancellation, expiry and returns.
The separate `indexer.env` belongs to a fresh frozen indexer database, replayed from its
first deployment block with the emitted event schema version. Env files contain public build configuration; keep
filled copies out of git. Never put credentials in a `VITE_` variable.

`VITE_DUSK_DOMAINS_SITE_URL` is an HTTP(S) origin (default `https://dusk.domains`).
It supplies the canonical, social and structured-data URLs and generated crawler
files. `VITE_DUSK_DOMAINS_OTHER_NETWORK_URL` adds a small footer link.
`VITE_DUSK_DOMAINS_NOINDEX=true` adds the noindex meta tag, disallows crawling,
omits sitemap files and identifies testnet in `llms.txt`. The indexer's dynamic
`/sitemap-names.xml` route should only be enabled on the mainnet virtual host.
The same generated text files are available during `npm run dev`.
`npm run dev:testnet` uses `.env.testnet.local` and proxies reads and drivers
to the testnet site.

For a local build, use `npm run build -- --mode mainnet` or
`npm run build -- --mode testnet` with those local env files. Vite's normal env
precedence applies. The build writes `dist/version.json` with `frontendCommit`,
`builtAt` (UTC), `chainId`, `siteUrl` and contract IDs keyed by role. Outside git,
set `DUSK_DOMAINS_FRONTEND_COMMIT` to the source commit.

## Deploy

The local machine needs Node 24, npm, git, tar, rsync, curl and OpenSSH. The server
needs rsync, Python 3 and Linux `renameat2` support on the filesystem containing
the served directories. The SSH user needs write access to their parent directory.
Configure `DEPLOY_HOST` as your SSH target and `DEPLOY_DIR` as the absolute served
path (for example `/srv/dusk-domains/dist`). Paths accept letters, digits, `/`,
`.`, `_` and `-`, with no `.` or `..` components. Keep these settings outside git.

```sh
scripts/deploy.sh .env.mainnet.local --contracts /path/to/mainnet/public/contracts
```

For testnet, select its `DEPLOY_DIR` and run:

```sh
scripts/deploy.sh .env.testnet.local --contracts /path/to/testnet/public/contracts
```

The script refuses a dirty worktree, builds a temporary archive of HEAD with
`npm ci` and the selected env file, and copies the supplied contracts directory
into that build's `public/contracts/`. Omit `--contracts` only when all referenced
drivers are already tracked. Temporary env and driver copies are removed on exit.

Uploads go to `<DEPLOY_DIR>.next`. An atomic directory exchange keeps the served
path present while replacing it; the old release becomes
`<DEPLOY_DIR>.prev-<UTC stamp>`. The three newest previous releases are retained.
A lock prevents overlapping deploys and rollbacks. The script then fetches the
site's `version.json` with a cache-busting query and checks its commit. Verification
failure exits nonzero and leaves the release available for inspection or rollback.
After an interrupted SSH session, inspect `.next` and `.lock` before removing
stale state and trying again.

## Rollback

With the same `DEPLOY_HOST` and `DEPLOY_DIR`:

```sh
scripts/deploy.sh --rollback
```

This atomically exchanges the current release with the newest previous release,
retains the displaced release as a new backup, and verifies the restored commit
using its manifest. It does not rebuild or need the original env file.

## SDK dependency

The frontend pins the exact published SDK release, `npm:@jsr/duskdomains__sdk@0.3.1`,
through the `@jsr` registry mapping in `.npmrc`. It never imports the removed
`/internal` or `/writes` entry points. UI presentation helpers live in `src/names/ui`.
