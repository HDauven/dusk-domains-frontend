# src/names

This directory is now a compatibility shim.

The Dusk Domains SDK implementation lives in the private package:

```text
@duskdomains/sdk
```

Keep app imports pointed at `src/names/index.ts` or `src/names/internal.ts` while the frontend still lives in this repository. Public read and integration APIs should come from the published `@duskdomains/sdk` package. First-party write, wallet and local-development helpers still come from the pinned SDK repository dependency until those subpaths are promoted to a public release.
