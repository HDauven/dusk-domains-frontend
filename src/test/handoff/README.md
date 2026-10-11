Local test-chain handoff supplied for the frozen frontend review (source commit 652de34f4b954ab17d903c4ed4a7908380d03cfb, dirty build). Not mainnet.

The SDK 0.3.2 upgrade replaces the six data drivers with the SDK's test fixtures
from commit `c78ab09` (protocol reference `4e7eff846445a80160804e6e99ab3f0c7d957dfd`).
Their uncompressed SHA-256 and byte counts were checked against the SDK's
`tests/fixtures/drivers.json`; the manifest and environment driver pins were
updated to match. Drivers are losslessly gzip-compressed and tests verify the
SHA-256 again before instantiation.

This is a synthetic compatibility fixture: contract IDs, deployment receipts and
other historical handoff data remain from the original review. It is not a current
deployment manifest. No contract WASM is included. The handoff intentionally has
no indexer URL; integration tests add a local /api setting and intercept every
fetch. No test connects to the handoff node.
