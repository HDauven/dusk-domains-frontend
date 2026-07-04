# src/names

This directory is now a compatibility shim.

The Dusk Domains SDK implementation lives in the private package:

```text
@hdauven/dusk-domains-sdk
```

Keep app imports pointed at `src/names/index.ts` or `src/names/internal.ts` while the frontend still lives in this repository. New SDK logic, tests, records, call builders, indexer-client helpers and Dusk Connect integration should be changed in `HDauven/dusk-domains-sdk` first, then consumed here through the package dependency.
