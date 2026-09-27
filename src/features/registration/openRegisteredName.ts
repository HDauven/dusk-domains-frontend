import type { DuskDomainsIndexerClient } from '../../names/internal'

// The indexer follows finalized blocks, so it can trail a registration that just executed by a
// block or two. Opening the name before it catches up would show it as still available.
export async function openRegisteredName(
  indexerClient: DuskDomainsIndexerClient | null,
  name: string,
  open: (name: string) => Promise<unknown> | void,
  { attempts = 20, delayMs = 1_500 } = {},
) {
  for (let attempt = 0; indexerClient && attempt < attempts; attempt += 1) {
    try {
      if ((await indexerClient.searchName(name)).status === 'registered') break
    } catch {
      // A failed read is retried like a stale one.
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  await open(name)
}
