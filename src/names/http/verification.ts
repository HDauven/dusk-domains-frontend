export type WebsiteVerification = {
  domain: string | null
  status: 'verified' | 'unverified' | 'mismatch' | 'checking' | 'retry'
  checkedAt: string | null
  dnssec: boolean
}

export function websiteDomain(value: string) {
  if (value.length > 4096 || /[\s\\]/.test(value)) return null
  const authority = /^https:\/\/([^/?#]+)/i.exec(value)?.[1]
  if (!authority || !/^[a-z0-9.-]+$/i.test(authority)) return null
  try {
    const host = new URL(value).hostname, labels = host.split('.')
    if (host !== authority.toLowerCase() || `_dusk-domains.${host}`.length > 253 || labels.length < 2 || !/[a-z]/i.test(labels.at(-1)!)) return null
    return labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) ? host : null
  } catch { return null }
}

export function isWebsiteVerification(value: unknown): value is WebsiteVerification {
  if (!value || typeof value !== 'object') return false
  const v = value as WebsiteVerification
  return ['verified', 'unverified', 'mismatch', 'checking', 'retry'].includes(v.status)
    && (v.domain === null || (typeof v.domain === 'string' && websiteDomain(`https://${v.domain}`) === v.domain))
    && (v.checkedAt === null || (typeof v.checkedAt === 'string' && Number.isFinite(Date.parse(v.checkedAt))))
    && typeof v.dnssec === 'boolean'
    && (v.status !== 'verified' || (v.domain !== null && v.checkedAt !== null))
}

export type BoundWebsiteVerification = { owner: string; website: string; result: WebsiteVerification }

export function boundWebsiteVerification(name: { owner: string; websiteVerification?: BoundWebsiteVerification }, website: string) {
  const bound = name.websiteVerification
  return bound && bound.owner === name.owner && bound.website === website ? bound.result : undefined
}
