# src/features

React product features for Dusk Domains.

Each folder owns a workflow or screen-level area:

- `search`: landing/search and availability result flow.
- `registration`: step-based domain purchase flow.
- `domains`: My Domains and domain detail views.
- `treasury`: operator treasury view and claim actions.
- `referrals`: referral status and claim actions.
- `wallet`: wallet connection and locked/unlocked state UI.
- `activity`: recent event display.

Keep protocol details out of feature components. Use `src/names` for call builders, record shapes, name policy, SDK reads, indexer access, and Dusk Connect integration.

Feature components should prefer simple props, local view state, and small workflow hooks. Avoid raw contract encoding, direct data-driver assumptions, or duplicated protocol constants in this layer.
