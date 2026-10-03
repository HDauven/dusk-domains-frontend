# src/names

This directory is now a compatibility shim.

The Dusk Domains SDK implementation lives in its separate package:

```text
@duskdomains/sdk
```

Keep app imports pointed at `src/names/index.ts` or `src/names/internal.ts`. Public read and integration APIs come from the SDK root. First-party write, wallet and local-development helpers come from explicit SDK subpaths through `src/names/internal.ts`, so the app does not import package internals directly across the codebase.

Driver JSON uses decimal strings for Lux amounts. The SDK accepts both these
strings and safe numbers from earlier drivers, validates bounded fees and
heights, and preserves large treasury and referral totals as decimal strings.
Use exact integer arithmetic when displaying or comparing accounting amounts.
