# src/names

This directory is now a compatibility shim.

The Dusk Domains SDK implementation lives in its separate package:

```text
@duskdomains/sdk
```

Keep app imports pointed at `src/names/index.ts` or `src/names/internal.ts`. Public read and integration APIs come from the SDK root. First-party write, wallet and local-development helpers come from explicit SDK subpaths through `src/names/internal.ts`, so the app does not import package internals directly across the codebase.

SDK 0.3.2 requires canonical decimal strings for Lux amounts and canonical integer
tokens in driver JSON. The frontend converts amount inputs through exact integer
arithmetic before building calls and preserves large treasury and referral totals as decimal strings.
Use exact integer arithmetic when displaying or comparing accounting amounts.

Registration quotes and new reservations use the SDK's `registrationPlacement`;
a released root on a retiring store registers at its eligible successor. Reveal
preparation uses `prepareRegistration` with the saved original commitment store
and observed inclusion height, validating the quote against the old generation
and grace end so the dropped-name premium remains included.

A governance `SetPolicy` keeps a reservation valid but not its price. The price a
reservation was made at, with the policy selection that quoted it, is kept in browser
storage beside the reservation. Reveal preparation continues only when the fresh quote
matches both the price shown and that policy selection; otherwise it throws
`RegistrationPriceChangedError` carrying the fresh quote, and the claim offers the
new price for the same reservation.

SDK 0.3.2 reads the tip height around every read and repeats routing reads inside each name
lookup. Until the frontend moves to SDK 0.4.x, the live app gives it `sharedReads.ts` as its
transport, which sends reads repeated at one block height once and keeps contract verification
replies for the tab's session. The name-read sharing in `reads.ts` stays after that.

The frontend does not persist SDK projection snapshots or restore projector
checkpoints. Indexed views and record sets live in React state and are fetched
again after loading. Browser storage holds reservation recovery (with each
reservation's price), referral attribution, watchlist preferences and, for the session,
contract verification replies, not projections. Projection schema 3
therefore needs no browser storage migration; an indexer persisting SDK snapshots
must rebuild or discard older checkpoints before serving current data. HTTP view
payloads are separate from the SDK's internal projection schema.
