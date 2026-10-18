// The SDK reads at the node's tip and reads a sequence again, up to three times, when a block lands
// during it; a preparation it restarts at the new height itself. When blocks keep landing it gives up
// with this error, which says only that the chain moved on, so the whole read is tried again from the
// start, a few times. A failure that repeats at every height it rethrows as itself, and that is final.
const races = [/Chain tip changed during read; retry the snapshot/]

export function isReadRace(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return races.some((race) => race.test(message))
}

/** Runs a read again, up to `attempts` times in all, while it fails only because a block landed. */
export async function retryReadRace<T>(read: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await read()
    } catch (error) {
      if (attempt >= attempts || !isReadRace(error)) throw error
    }
  }
}
