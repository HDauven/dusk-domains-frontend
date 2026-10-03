# Changelog

## Unreleased

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
