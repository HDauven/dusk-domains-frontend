// SDK 0.3.2 reads at the node's tip and compares the height around each read. When a block lands
// mid-read, a snapshot reads again, three times at most, and a registration quote taken at the new
// height no longer matches the preparation that asked for it. Both say only that the chain moved
// on, so the whole read is tried again from the start, a few times.
const races = [
  /Chain tip changed during read; retry the snapshot/,
  /Registration quote does not match placement and previous lifecycle/,
]

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
