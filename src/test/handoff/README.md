Local test-chain handoff supplied for the frozen frontend review (source commit 652de34f4b954ab17d903c4ed4a7908380d03cfb, dirty build). Not mainnet.

manifest.json, frontend.env and indexer.env are unchanged copies. Drivers are losslessly gzip-compressed; tests decompress and verify their original SHA-256 before instantiation. No contract WASM is included. The handoff intentionally has no indexer URL; integration tests add a local /api setting and intercept every fetch. No test connects to the handoff node.
