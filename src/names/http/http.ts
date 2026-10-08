// App presentation / HTTP view model, ported from SDK 0.2.0 (MIT).
import { frozenView } from './frozenViews'
import { isRecord } from './guards'

const cooldowns = new WeakMap<typeof fetch, Map<string, number>>()

function retryDelay(value: string | null) {
  const seconds = value?.trim() ? Number(value) : NaN
  const delay = Number.isFinite(seconds) ? seconds * 1000 : value ? Date.parse(value) - Date.now() : NaN
  return Number.isFinite(delay) ? Math.min(60_000, Math.max(0, delay)) : 5_000
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name))
}

// All indexer reads using this transport share the server's cooldown. Writes never
// pass through this GET-only helper, including their transaction submission path.
export async function getJson(fetcher: typeof fetch, url: string) {
  let origins = cooldowns.get(fetcher)
  if (!origins) { origins = new Map(); cooldowns.set(fetcher, origins) }
  const origin = new URL(url, 'http://localhost').origin
  const backOff = (delay: number) => origins.set(origin, Math.max(origins.get(origin) ?? 0, Date.now() + delay))
  for (let attempt = 0; ; attempt++) {
    while ((origins.get(origin) ?? 0) > Date.now()) {
      await new Promise(resolve => setTimeout(resolve, origins.get(origin)! - Date.now()))
    }
    let payload: unknown
    try {
      const response = await fetcher(url, { cache: 'no-store', headers: { accept: 'application/json' } })
      if (response.status === 429) {
        backOff(retryDelay(response.headers.get('Retry-After')))
        if (attempt === 0) { await response.body?.cancel(); continue }
      }
      if (!response.ok) {
        const detail = await responseErrorDetail(response)
        throw new Error(`Dusk Domains indexer request failed with HTTP ${response.status}${detail ? `: ${detail}` : ''}.`)
      }
      payload = await response.json()
    } catch (error) {
      const networkError = isNetworkError(error)
      if (networkError) backOff(5_000)
      if (networkError && attempt === 0) continue
      throw error
    }
    return frozenView(payload, new URL(url, 'http://localhost').pathname)
  }
}

export function endpointUrl(baseUrl: string, path: string, params: Record<string, string>) {
  const query = new URLSearchParams(params)
  const suffix = query.toString()
  return suffix ? `${baseUrl}/${path}?${suffix}` : `${baseUrl}/${path}`
}

export function normalizeBaseUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, '')
  if (!normalized) throw new Error('Dusk Domains indexer base URL is required.')
  return normalized
}

async function responseErrorDetail(response: Response) {
  try {
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      return errorDetailFromPayload(await response.json())
    }

    const text = (await response.text()).trim()
    return truncateErrorDetail(text)
  } catch (error) {
    if (isNetworkError(error)) throw error
    return ''
  }
}

function errorDetailFromPayload(payload: unknown) {
  if (isRecord(payload)) {
    if (typeof payload.message === 'string') return truncateErrorDetail(payload.message)
    if (typeof payload.error === 'string') return truncateErrorDetail(payload.error)
    if (typeof payload.code === 'string') return truncateErrorDetail(payload.code)
  }

  return ''
}

function truncateErrorDetail(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return ''
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized
}
