# src/names

This directory is now a compatibility shim.

The Dusk Domains SDK implementation lives in the private package:

```text
@duskdomains/sdk
```

Keep app imports pointed at `src/names/index.ts` or `src/names/internal.ts`. Public read and integration APIs come from the SDK root. First-party write, wallet and local-development helpers come from explicit SDK subpaths through `src/names/internal.ts`, so the app does not import package internals directly across the codebase.
