# src/names

This directory is now a compatibility shim.

The Dusk Domains SDK implementation lives in its separate package:

```text
@duskdomains/sdk
```

Keep app imports pointed at `src/names/index.ts` or `src/names/internal.ts`. Public read and integration APIs come from the SDK root. First-party write, wallet and local-development helpers come from explicit SDK subpaths through `src/names/internal.ts`, so the app does not import package internals directly across the codebase.

The SDK requires canonical decimal strings for Lux amounts and canonical integer
tokens in driver JSON. The frontend converts amount inputs through exact integer
arithmetic before building calls and preserves large treasury and referral totals as decimal strings.
Use exact integer arithmetic when displaying or comparing accounting amounts.

Registration prices shown come from the SDK's `previewRegistration`, for display only.
New reservations use `registrationPlacement`; a released root on a retiring store
registers at its eligible successor. Reveal preparation uses `prepareRegistration` with
the saved original commitment store and observed inclusion height, validating the quote
against the old generation and grace end so the dropped-name premium remains included,
and signs only that quote.

A name page's renewal price comes from the SDK's `previewRenewal` over the page `namePage`
returned, for display only: no read where the SDK can price it, a direct quote elsewhere,
and no term past the page's horizon (`max_years`). Renew quotes again with `quoteRenewal`
right before the wallet is asked and signs only that quote.

A governance `SetPolicy` keeps a reservation valid but not its price. The price a
reservation was made at, with the policy selection that quoted it, is kept in browser
storage beside the reservation. Reveal preparation continues only when the fresh quote
matches both the price shown and that policy selection; otherwise it throws
`RegistrationPriceChangedError` carrying the fresh quote, and the claim offers the
new price for the same reservation.

The SDK reads through the release's lens when it has one: a name page (`namePage`), a primary
name (`verifyPrimary`), a registration price (`previewRegistration`) and the directory's state
(`bootstrap`) each take one contract query, given the indexer's `homeShard` as the store to read
first. It shares reads repeated at one block height itself. `reads.ts` keeps one name read per
name and height, which a name page's read fills, so the page's other parts don't read the name
again. A lens read verifies nothing for signing: `prepareFrozenCall`, and the live app before Connect
prepares or signs, verify the call's target with the client first.

The frontend does not persist SDK projection snapshots or restore projector
checkpoints. Indexed views and record sets live in React state and are fetched
again after loading. Browser storage holds reservation recovery (with each
reservation's price), referral attribution, watchlist preferences and, for the session,
what the SDK's contract verification read, not projections. Projection schema 3
therefore needs no browser storage migration; an indexer persisting SDK snapshots
must rebuild or discard older checkpoints before serving current data. HTTP view
payloads are separate from the SDK's internal projection schema.
