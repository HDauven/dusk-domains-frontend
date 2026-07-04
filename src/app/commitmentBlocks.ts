export async function waitForCommitmentBlock(args: {
  commitment: string
  refresh: (commitment: string) => Promise<boolean>
  attempts?: number
  delayMs?: number
}) {
  const attempts = args.attempts ?? 15
  const delayMs = args.delayMs ?? 1_000

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await args.refresh(args.commitment)) return true
    if (attempt < attempts - 1) {
      await new Promise((resolve) => globalThis.setTimeout(resolve, delayMs))
    }
  }

  return false
}
