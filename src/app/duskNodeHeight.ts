export type CurrentBlockHeightReader = () => Promise<number | null>

const latestBlockHeightQuery = '{ block(height: -1) { header { height } } }'

export function createDuskNodeBlockHeightReader(
  nodeUrl: string,
  fetchImpl: typeof fetch = fetch,
): CurrentBlockHeightReader {
  return () => fetchDuskNodeCurrentBlockHeight(nodeUrl, fetchImpl)
}

export async function fetchDuskNodeCurrentBlockHeight(
  nodeUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<number | null> {
  const baseUrl = nodeUrl.trim()
  if (!baseUrl) return null

  let endpoint: URL
  try {
    endpoint = new URL('/on/graphql/query', baseUrl)
  } catch {
    return null
  }

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/graphql',
      },
      body: latestBlockHeightQuery,
    })
    if (!response.ok) return null

    const body = await response.json() as unknown
    return blockHeightFromGraphqlResponse(body)
  } catch {
    return null
  }
}

export function blockHeightFromGraphqlResponse(body: unknown): number | null {
  const height = (body as {
    data?: {
      block?: {
        header?: {
          height?: unknown
        }
      }
    }
  })?.data?.block?.header?.height ?? (body as {block?:{header?:{height?:unknown}}})?.block?.header?.height

  const numericHeight = typeof height === 'number'
    ? height
    : typeof height === 'string'
      ? Number(height)
      : Number.NaN

  return Number.isSafeInteger(numericHeight) && numericHeight >= 0 ? numericHeight : null
}
