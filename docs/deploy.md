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

Mainnet and testnet sites set `VITE_DUSK_DOMAINS_MANIFEST_URL=/manifest.json`, as the examples do,
and every deploy gives the network's reviewed `manifest.json` with `--manifest`: it is served at
the site root with `contracts/` beneath it. A local chain can deploy without a manifest only when
its env file sets `DUSK_DOMAINS_DEPLOY_WITHOUT_MANIFEST=true`. Start from the bundle's `manifest.json` and keep the network's copy
outside git, beside its `contracts/`. Driver paths are relative to the manifest directory. The app explicitly adapts the
`dusk-domains/frozen-release/v1` handoff (`contracts[].id` and `artifacts[role].driver`)
to SDK `contractId`/`dataDriver` entries. It validates the configured chain and each role's
ID, and the SDK verifies driver hashes and schemas before using them. SDK-format manifests
are also accepted for reviewed releases containing multiple admitted implementations.
The manifest must list every admitted store/resolver/market implementation the client
may follow, and the policy a `SetPolicy` proposal selects ([Contracts admitted after launch](#contracts-admitted-after-launch)).
SDK reads
verify admission, binding, driver checksum and monotone forwarding. New name actions resolve
the current home; saved reservations retain their original commitment store. Existing marketplace
orders retain their marketplace, order ID and original store, including cancellation, expiry and returns.
The separate `indexer.env` belongs to a fresh frozen indexer database, replayed from its
first deployment block with the emitted event schema version. Env files contain public build configuration; keep
filled copies out of git. Never put credentials in a `VITE_` variable.

`VITE_DUSK_DOMAINS_EXPLORER_URL` links transaction IDs in a name's activity to a
block explorer: `https://explorer.dusk.network` on mainnet and
`https://apps.testnet.dusk.network/explorer` on testnet. Leave it empty to hide the links.

`VITE_DUSK_DOMAINS_NAME_WALLETS` lists the wallets that can send to a `.dusk` name and
`VITE_DUSK_DOMAINS_NAME_EXPLORERS` the explorers that show `.dusk` names. A name's owner sees
them under "How people pay you", and the "Send to" box names the wallets. Each is
comma-separated, an entry being `Name` or `Name|https://link`. A link that isn't https is
dropped, and a name listed twice keeps its first entry. Leave them empty until that
support ships; the page then says wallets can't send to `.dusk` names yet.

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
scripts/deploy.sh .env.mainnet.local --contracts /path/to/mainnet/public/contracts --manifest /path/to/mainnet/manifest.json
```

For testnet, select its `DEPLOY_DIR` and run:

```sh
scripts/deploy.sh .env.testnet.local --contracts /path/to/testnet/public/contracts --manifest /path/to/testnet/manifest.json
```

The script refuses a dirty worktree, builds a temporary archive of HEAD with
`npm ci` and the selected env file, and copies the supplied contracts directory
into that build's `public/contracts/` and the manifest to `public/manifest.json`.
Omit `--contracts` only when all referenced drivers are already tracked. Before
anything is uploaded, validation refuses a deploy without a manifest, a manifest URL other
than `/manifest.json`, a manifest for another network, one that leaves out a configured
contract, and one whose contracts use a driver this build doesn't pin. A mainnet or testnet
deploy needs `--manifest`: a `public/manifest.json` tracked in git is never served in its
place. The chain ID is read as the built site reads it, so `"dusk:1 "`, with its space, is
mainnet too. Temporary env, driver and manifest copies are removed on exit.

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
using its manifest. It does not rebuild or need the original env file. The restored
release serves the `manifest.json` it was deployed with: if governance admitted a
contract since then, deploy the current manifest again.

## Contracts admitted after launch

Governance admits and selects contracts through delayed directory proposals: `SetPolicy`
selects a new registration policy, `AddStore` and `AddResolver` add shards, `SetMarketplace`
lists a new market and `SetPreferredMarketplace` sends new orders to it. Anyone can execute a
proposal once it is ready, so the site must be ready by the proposal's `ready_at`, not by
when someone executes it. Before the proposal becomes ready:

1. Add the contract to the network's `manifest.json`. In the handoff format, append
   `{"key":"<role>","id":"<contract ID>","codeHash":"<its code hash>","initHash":"<its init hash>"}` to `contracts`;
   SDK-format manifests take another entry for the role. Keep every existing entry,
   including a market being drained or a store being retired, so names and orders there
   stay readable, settleable and cancellable.
2. Check that the contract uses the driver this build pins for its role, in
   `VITE_DUSK_DOMAINS_<ROLE>_DRIVER_URL`. A new driver needs a rebuild with new pins,
   deployed before the proposal is ready.
3. Deploy the current commit with the updated manifest, as in [Deploy](#deploy).

Open pages read the manifest again when the chain uses a contract their release lacks, and
build a fresh client after a failed creation, or after a contract fails verification once its
driver has loaded, so they follow the change without a reload. New listings and offers go to
the market the directory prefers, which the site reads again every three minutes. If a
proposal executes before the manifest lists its contract, the
site says it hasn't been updated for that contract yet, and recovers once the manifest is
deployed. If the site can't be ready in time, cancel the proposal before `ready_at`.

## Registration price changes

Registration prices change through a new immutable policy contract, which a delayed directory
`SetPolicy` proposal selects. Renewal prices follow the directory's renewal schedule instead and
need no site update. Before the proposal becomes ready, deploy the reviewed manifest with the new
policy listed beside the old one: add `{"key":"policy","id":"<new policy ID>","codeHash":"<its code hash>","initHash":"<its init hash>"}`
to the handoff's `contracts` (SDK-format manifests take a second `policy` entry). It must use the
reviewed policy driver pinned by `VITE_DUSK_DOMAINS_POLICY_DRIVER_URL`; a new driver needs a rebuild
with new pins. Keep the configured policy's entry. The app reads the manifest again, revalidating
any cached copy, when the chain selects a contract the loaded release lacks.

Without that entry, once the proposal executes, registration quotes and registrations say the
site has not been updated for the new registration prices yet, on open pages and on pages loaded
afterwards. Renewals, records, transfers, primary names and the market keep working: only
registration uses the policy. A site configured without `VITE_DUSK_DOMAINS_MANIFEST_URL` can't
list both policies: redeploy it with the new `VITE_DUSK_DOMAINS_POLICY_CONTRACT_ID` as the proposal
executes, or give it a manifest URL.

Reservations made under the old policy stay valid. Register shows the old and new price and
registers the same reservation once the new price is confirmed. A registration the chain refuses
because its price changed returns the payment; only the network fee is charged. The site reads the
indexer's prices again every three minutes. While the indexer withholds a new policy it can't
verify, the site shows no registration prices and registration stays paused.

## SDK dependency

The frontend pins the exact published SDK release, `npm:@jsr/duskdomains__sdk@0.3.2`,
through the `@jsr` registry mapping in `.npmrc`. It never imports the removed
`/internal` or `/writes` entry points. UI presentation helpers live in `src/names/ui`.

### Moving to SDK 0.4.0

SDK 0.4.0 isn't patch-compatible with 0.3.x. Before the pin moves:

- [ ] Pass `client.release` to `createDuskDomainsConnectApp(wallet, client.release)` in
  `src/app/duskDomainsLiveApp.ts`, not the release object the app loaded.
- [ ] On `ContractRefusedError`, build a new client once the release is fixed. A contract that
  isn't admitted yet, or a missing artifact, stays retryable on the same client.
- [ ] Before building `listFixed`, `auction` or `acceptOffer`, call
  `client.verifyContract('marketplace', id)` and build the calls with
  `client.release.drivers.get(marketId)`, for every market, including a draining one
  (`src/names/prepareFrozenCall.ts`).
- [ ] Sign only the exact quote object `quoteRegistration` or `prepareRegistration` returned:
  a quote that was cloned, serialized, persisted or wrapped in a proxy can't be signed. The site
  keeps or rebuilds quote state in these places, and each must quote again before signing:
  - `src/features/registration/reservationQuote.ts` saves a plain summary of the quote a
    reservation was made at (term, total, policy and versions) in `localStorage`, under
    `dusk-domains.claim-quote:<chain>:<commitment>`. Register only compares it with a fresh quote.
  - `src/names/reservations.ts` saves reservations through the SDK: secret, commitment and
    term, without a quote.
  - `src/names/prepareFrozenCall.ts` quotes again with `client.prepareRegistration` when
    Register signs, and signs `priced.calls.reveal`. Its `withWalletDetails` returns a copy of
    the call (`{ ...call, display }`): check that the wallet still receives a call 0.4.0 accepts,
    or attach the display details without copying the call.
  - `src/features/registration/completeRegistrationCall.ts` passes the preview quote, or a new
    price the person confirmed (`RegistrationPriceReview.quote`, held in React state), as
    `call.quote`. `prepareFrozenCall` only compares it with the fresh quote. Never hand it to
    `prepareRegistration` or `registrationCalls` in place of quoting again.
  - `src/features/search/useNamePreview.ts` keeps the live quote from `useLiveQuotes` as
    `NameResult.policyQuote`, and `prepareRegistrationCommit.ts` turns it into the saved summary.
  - The commit is built from the saved commitment hash with `storeCommitCall`, without a quote.
    If 0.4.0 builds commits only through `registrationCalls`, quote right before the commit.
- [ ] `src/names/readRace.ts` reads again, and prepares a call again, when SDK 0.3.2 reports
  that a block landed mid-read (`Chain tip changed during read; retry the snapshot`, or a
  registration quote at another height). 0.4.0 restarts a preparation at the new height itself
  and rethrows a failure that repeats at every height as itself: keep the retry only for the
  errors 0.4.0 still throws when the tip moves.
- [ ] Create the client with `createClientFromManifest` alone, in
  `src/app/duskDomainsLiveApp.ts`. 0.4.0's discovery no longer verifies the policy the directory
  selects; under 0.3.2, `discoverWithoutPolicy` in `src/names/directoryMembers.ts` discovers the
  deployment without it while the manifest doesn't list that policy yet.
- [ ] Read stores with the SDK's own reads again. `rawRead` and `admittedStores` in
  `src/names/directoryMembers.ts` keep 0.3.2's nested reads from taking their own heights inside
  a snapshot, and keep their own record of verified stores; 0.4.0 runs nested reads in one
  snapshot and keeps a verification ledger per client.
- [ ] The Connect app signs only for the directory, the vault and contracts whose release entry
  carries both `codeHash` and `initHash`. `adaptDeploymentManifest` in
  `src/names/releaseManifest.ts` copies a handoff entry's `initHash`, and handoffs carry one
  for every contract. A release built from environment variables alone (`manifestFromConfig`
  in `src/names/config.ts`, used without `VITE_DUSK_DOMAINS_MANIFEST_URL`) carries neither and
  can no longer sign store or market calls: give local and preview builds a manifest too.
