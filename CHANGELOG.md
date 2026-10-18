# Changelog

## Unreleased

- Read a name page, a primary name, a registration price and the preferred market through the release's read lens, one node query each at any number of stores, and read directly whatever it can't answer.
- Start name and primary reads at the store the indexer names as the name's home.
- Use only the lens the build pins, turn it off with `VITE_DUSK_DOMAINS_USE_LENS=false`, and refuse a deploy whose manifest and build disagree about it.
- Verify each contract the first time the site reads through it, and a write's target before the wallet is asked.
- Ask to check the price again when a registration's quote can't be signed.
- Require at least 5 DUSK for an offer, fixed price or auction reserve, the marketplace contract's minimum.
- Read each name once per block across a page, ask the node once for reads the SDK repeats in a block, and keep contract verification for the browser session.
- Label referral claims, protocol fee claims and pricing updates by their action in transaction notices, not as a `.dusk` name.
- Change a primary name kept in another shard with two named wallet approvals, clearing it there first, and never send a set the chain refuses.
- Check a primary name on chain before each wallet request, and say why when its Dusk address isn’t the wallet’s, the wallet doesn’t control it, or it expired or is moving.
- Never offer an address the indexer reports invalid, or that fails validation, as a payment target.
- Give only known record keys a label or link; show any other key exactly, marked as a custom record.
- Show the first lines of a long record, with Show all, on every view that lists records.
- Read no registration quotes while registrations are paused, and explain a `Closed` refusal plainly.
- Say on the claim card that registrations are paused, as the banner does, and who creates a subname.
- Warn when a saved reservation can expire before registrations reopen, or within the hour.
- Let anyone renew a listed name, and say that renewing doesn't change the listing.
- Place new listings and offers at the market the directory prefers now, read every three minutes.
- Treat an indexer that reports another network or contracts as unhealthy.
- Build a fresh client after a failed creation, or once it refuses a contract, without a reload.
- Price names exactly at any size, and keep the app running when one view fails to render.
- Accept new activity and treasury event types, and say when name data stopped updating.
- Deploy the network's manifest with `--manifest`, and refuse one that doesn't match the build.
- Require `--manifest` for mainnet and testnet deploys, reading the chain ID as the site does; only a local chain may opt out, explicitly.
- Show a market fee the indexer can't authenticate as unknown, and take no new listing or offer then.
- List orders and refunds in every admitted market, and withdraw each refund from its own market.
- Take no bid at a paused, draining, retired, unconfigured or unauthenticated market; read the market live before each new order or bid.
- Keep showing name data while the indexer's collector is stuck, marked as stopped at its block, and pause write confirmations.
- Show or copy a Dusk address only from a record "Send to" would offer, in headers, owner labels, primary names and My names too.
- Trust an indexer only when its deployment record is complete, conflict-free and names this site's contracts first.
- Never count a market whose verification failed, the preferred one included, or one a discarded client listed, as known.
- Renew a listed name through its market, bound to the reviewed order, and someone else's name only while the reviewed owner holds it.
- Offer no renewal while the block height is unknown, and refuse a renewal price too large to handle exactly.
- Drop the registration quote on screen and turn Claim off when registrations pause.
- Act on an order only at the market and order it was listed with.
- Keep renewals, records, transfers and the market working while the manifest doesn't list a newly selected policy.
- Load name pages and confirm writes while blocks land fast: read primary names in one short read, and read again when a block lands mid-read.
- Say a refused registration's payment was returned when the wallet reports the refusal as an error, and price it again when a block lands meanwhile.

- Follow a registration policy replacement without a reload: read the indexer's prices again every three minutes, and quote names again then and whenever the policy version changes.
- Keep the price a reservation was made at with it. When a policy replacement changed the price, before signing or when the chain refuses the registration with QuoteChanged or FeeMismatch (also when the wallet's receipt carries that refusal as bytes), Register names the old and new price, says the reservation is still valid and, only after the chain refused the signed transaction, that the payment was returned. A quote that finds the price changed before any wallet request says only that the price changed. Register at the new price registers the same reservation, with no new commitment, and keeps that price for the next try. A name the new policy reserves or closes says so.
- Estimate renewals from the renewal schedule, never from registration prices, and show no renewal price when neither a quote nor the schedule is known.
- Keep search working while the indexer withholds a new policy it can't verify: show no registration prices and say why an available name can't be claimed. Say so plainly too when this site's manifest doesn't list the new policy yet, and revalidate the manifest whenever it is read again.

- Say on every subname's page, to its holders and to visitors, that the owner or manager of a name above can take it back, give it to another wallet or remove it, and that its holder can't prevent this. Show a name's manager beside its owner, show holders by Dusk address where the names above or a registration prove it, and explain an account ID with no matching address.
- Show the full manager address in a review step before creating a subname for another manager, and name the new owner and manager in the wallet details. A take-back's wallet details show the signer's address.
- Name the subname, the action and, where the data proves it, who made it for subname changes in a parent's activity, Recent list and CSV, read from each subname's own activity. A count or a single subname is given only when every subname that could have changed was read and none can have left the namespace since. The CSV shows an account by its Dusk address when one is known.
- Turn the claim's primary-name switch on by default only when the connected wallet has no primary name, or when the claim registers that dropped name again, which clears it anyway. Save a choice someone makes, never the default, with the reservation, for that wallet account only. Read the primary name again before Register signs: the default follows that read, and a switch turned on replaces a primary name only when Register was pressed with that name shown, and asks otherwise. Say what a primary name does and what the claim does to the wallet's current one.
- State renewal prices, the ten-year limit, the 30 days to renew after expiry and the dropped-name premium below the home page prices, and the seller fee in the market header, before anyone connects. Explain how auctions start, end, settle and close on auction pages and in the sell form, and that a listed name stays in escrow until it sells or is returned. Call a new auction "Listed for auction" in activity instead of "Auction started".
- State referral rates and rules on the Referrals page from the live policy and renewal schedule: the registration and renewal shares, how to claim, who can earn and when a link counts. Say beside Share, and after copying, that the link includes your Dusk address as a referral.
- Tell a name's owner where a `.dusk` name works today and how people pay it, naming only the wallets and explorers listed in `VITE_DUSK_DOMAINS_NAME_WALLETS` and `VITE_DUSK_DOMAINS_NAME_EXPLORERS`, and explain the Send to box. Say a listed wallet can send to the name only when it has a Dusk address.
- Add X, Discord, GitHub and Link records, with help text and format checks, and link them on the profile when their values check out. A record that can't be saved is named as the editor names it, such as "Description", not by its key.
- Ask before taking back a subname, and say that its records and primary name are cleared and its holder loses it.
- Make Register on a saved, ready reservation sign the reveal once the claim is open, and keep the reservation's commitment store when a claim resumes after the wallet session restores.
- Keep checking a wallet session that lost its authorization without the user disconnecting, so the header recovers from "Connect wallet" without a reload.
- Show a listed name's price or current bid with a link to its listing on its page and in the taken search result, and say the market holds it while listed.

- Add a Developers page at `/developers` (and `/docs`): resolve a name with curl against the site's API or with the SDK, this network's contract IDs and deployment manifest, and links to the SDK on JSR, its source, the API reference and `llms.txt`. The footer links to it and to the SDK, API and `llms.txt`.
- Make the SDK example work with what the site publishes: it converts a deploy tool manifest to the SDK's format, or loads the manifest the page lists. A test runs it against the frozen handoff.

- Explain the two claim signatures in the claim flow: the first reserves the name without revealing it, the second registers it and pays.
- State who controls a registered name, matching the Terms: its owner and its manager, and that a manager can change its records and subnames but can't transfer it. Say so on the owner's name page, in the claim confirmation, on the Treasury and developers pages and in Terms section 5.
- Point the Terms, Privacy Notice and `llms.txt` at the support@, abuse@ and security@dusk.domains addresses the site links to, instead of GitHub forms. Legal pages render plain mailto links.
- Match the Terms and `llms.txt` to the contracts: anyone can pay to renew a name, a listed one too, while this site lets a name's owner or manager renew it, and a listed one only after it leaves the market; renewal prices can change for registered names, while reserved names affect only new registrations; the operator claims only the protocol's share of the treasury. A subname's page says the owner or manager of a name above it can take it back, and that it expires with or no later than its parent.

- Offer only renewal terms that keep a name within ten years of the current block, say why longer terms are missing, and show a plain message instead of a raw contract read error.
- Say "Expires" with the date instead of "Renews by", and explain beside it that nothing renews automatically and a name can still be renewed for 30 days after it expires.

- Keep names listed or in auction in My names, with their market status and a link to the listing. Add `/market/listing/<name>`, which opens Browse at that listing.
- List subnames the wallet owns or manages under someone else's name, with its role, from the indexer's holder index (`/holdings`). An older indexer lists holders' root names only; then, or when the holder index can't be read, My names finds these through the owner index, the wallet's primary name and subname pages opened in this browser.
- Read the listing a link names directly, so it opens even when it isn't on the loaded pages of the market. If that read fails, the market still loads and tries again on its next refresh.

- Stage several record edits, additions and removals, then save them in one `mutate_records` transaction within the 8-change and 4,096-byte batch limits. A single edit still saves in one click. Refuse a change that would take a name past 16 records.
- Keep staged record changes editable, even while a value is empty or can't be saved, and keep them with their name when its records panel closes, another name opens or a subname is created. A staged value that can't be saved shows why, with Edit and Undo. Other sections of the name page say how many are unsaved, and the page asks before it closes with changes unsaved.

- Show a name's activity as plain actions with their prices and parties, such as "Registered for 1 year · 10 DUSK" or "Sold to … for 30 DUSK", folding internal bookkeeping events into the action they belong to. Show the exact UTC time, the actor and the transaction, linked to `VITE_DUSK_DOMAINS_EXPLORER_URL` when set, and download the full history as CSV.
- Accept controller and retired-registration events in activity pages; one such row made the whole page unreadable.
- Credit a record change to the name's holder when one wallet owns and manages it, and nobody when the holders changed in the same block. Read clearing every record as removing them, a records move as a move and records staged for a move to another registry as a copy, and name the subname a parent's change created only when that transaction took its serial.

- Show primary names only while authority-gated resolution succeeds. Explain paused or stale mappings after listing, transfer or expiry and retain the option to clear them.

- Route released-name registration through eligible retirement successors while preserving saved commitments and dropped-name premiums.

- Show DNS website verification from the current owner and website binding, with recoverable pending checks.

- Check availability when Search or Enter is pressed, not after each typed letter, so the page stays still while typing.

- Apply the SDK gas policy to every wallet write using the connected Moonlight account.

- Bind bids and marketplace lifecycle actions to the reviewed placement, and compare immutable auction terms and sale fees before signing. Show current bidding information without blocking a reviewed bid after an intervening bid.
- Show namespace authority and descendant counts when accepting offers. Require explicit acknowledgement for listings and offer acceptance when descendants exist.

- Update name-page metadata as visitors navigate. ([#201])
- Offer canonical name links with connected-wallet referrals and downloadable cards. ([#201])
- Keep incoming referral attribution across routes for the browser session. ([#201])

- Show dropped-name premiums in search and registration. ([#124])
- Refresh premium dates and warnings with the current search height. ([#124])
- Confirm upcoming price drops inside the claim card. ([#124])
- Preserve exact Lux values when editing treasury fees. ([#124])

- Offer cross-chain address records in the editor and copyable addresses on public profiles. ([#242])
- Show whether a primary name was set or cleared for its address in Activity. ([#243])

- Require the displayed offer name to hash to its node before acceptance, cancellation or expiry. ([#239])
- Keep marketplace escrow unknown for malformed or zero contract IDs. ([#239])
- Preserve the current wallet chain through live write wrappers. ([#239])
- Bind offer acceptance to the canonical placement and fee captured during review. ([#239])

- Always reset identity for namespace Reassign and Take back, including names the caller owns. ([#237])
- Offer connected endpoints primary clearing on the matching name’s overview page. ([#237])
- Recover connected endpoints’ stored primary mappings when the indexer hides expired names. ([#237])
- Explain identity clearing for subname take-back and reassignment. ([#237])

- Let connected addresses clear their primary names after losing name authority. ([#237])

- Default transfers to clearing records and primary names while handing over both roles. ([#237])
- Limit ancestor controls to Reassign, Take back and Remove. ([#237])

- Let namespace controllers reassign and remove descendants. ([#237])
- Show namespace summaries on listings and offer seller-held subname take-back after purchases. ([#237])

- Hide renewal for names in marketplace escrow and explain when sellers can renew. ([#235])
- Let connected wallets renew contract-owned roots without gaining management controls. ([#235])
- Show reservation-cap errors with a path to My names. ([#235])
- Accept reserved subname labels and keep subnames out of public root registration. ([#235])

[#235]: https://github.com/HDauven/dusk-domains-protocol/issues/235

[#237]: https://github.com/HDauven/dusk-domains-protocol/issues/237

[#239]: https://github.com/HDauven/dusk-domains-protocol/issues/239

[#242]: https://github.com/HDauven/dusk-domains-protocol/issues/242
[#243]: https://github.com/HDauven/dusk-domains-protocol/issues/243
[#201]: https://github.com/HDauven/dusk-domains-protocol/issues/201
[#124]: https://github.com/HDauven/dusk-domains-protocol/issues/124
