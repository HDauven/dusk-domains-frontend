# Changelog

## Unreleased

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
