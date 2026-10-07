/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { parseEnv } from 'node:util'
import { loadDataDriver, verifyArtifact, type ContractRole } from '@duskdomains/sdk'

export const handoff = JSON.parse(readFileSync('src/test/handoff/manifest.json', 'utf8'))
export const handoffEnv = parseEnv(readFileSync('src/test/handoff/frontend.env', 'utf8'))
export function handoffDriver(role: ContractRole): Uint8Array {
  const artifact = handoff.artifacts[role].driver
  const bytes = new Uint8Array(gunzipSync(readFileSync(`src/test/handoff/${artifact.path}.gz`)))
  verifyArtifact(bytes, artifact)
  return bytes
}
export async function handoffDrivers() {
  return new Map(
    await Promise.all(
      (Object.keys(handoff.artifacts) as ContractRole[]).map(
        async (role) => [role, await loadDataDriver(handoffDriver(role))] as const,
      ),
    ),
  )
}
