import { validateRecordValue as validateFrozenRecord } from '@duskdomains/sdk'
import { unicodeInputError } from '../unicode'
// App presentation / HTTP view model, ported from SDK 0.2.0 (MIT).
import {
  checksumEthereumAddress,
  normalizeBitcoinAddress,
  validateBitcoinAddress,
  validateEthereumAddress,
  validateSolanaAddress,
} from '@duskdomains/sdk/chain-addresses'

export const RECORD_VISIBILITIES = ['public', 'sensitive_public'] as const

export type RecordVisibility = (typeof RECORD_VISIBILITIES)[number]

export type StaticRecordKey =
  | 'moonlight_address'
  | 'phoenix_payment_endpoint'
  | 'dusk_contract'
  | 'dusk_asset'
  | 'evm_address'
  | 'address.btc'
  | 'address.eth'
  | 'address.sol'
  | 'address.evm'
  | 'website'
  | 'avatar'
  | 'content_pointer'
  | 'attestation_ref'
  | 'compliance_ref'

export type DynamicRecordKey = `text.${string}` | `service_endpoint.${string}`
export type ResolverRecordKey = StaticRecordKey | DynamicRecordKey

export type ResolverRecord = {
  key: ResolverRecordKey
  value: string
  visibility: RecordVisibility
  updatedAt: string
  ttlSeconds: number
}

export type RecordDefinition = {
  key: ResolverRecordKey
  label: string
  visibility: RecordVisibility
  maxBytes: number
  defaultTtlSeconds: number
  eligibleForPrimaryName: boolean
  eligibleForDefaultDuskRecipient: boolean
  validate: (value: string) => string[]
  normalize?: (value: string) => string
}

export type EncodedResolverRecord = {
  version: 1
  key: ResolverRecordKey
  value: string
  visibility: RecordVisibility
  updatedAt: string
  ttlSeconds: number
}

const HTTPS_URL_MAX_BYTES = 512
const OPAQUE_REF_MAX_BYTES = 512
const TEXT_MAX_BYTES = 512

const staticDefinitions: Record<StaticRecordKey, RecordDefinition> = {
  moonlight_address: {
    key: 'moonlight_address',
    label: 'Dusk address',
    visibility: 'public',
    maxBytes: 160,
    defaultTtlSeconds: 300,
    eligibleForPrimaryName: true,
    eligibleForDefaultDuskRecipient: true,
    validate: validateMoonlightAddress,
  },
  phoenix_payment_endpoint: {
    key: 'phoenix_payment_endpoint',
    label: 'Dusk Shielded Address',
    visibility: 'sensitive_public',
    maxBytes: 256,
    defaultTtlSeconds: 300,
    eligibleForPrimaryName: false,
    eligibleForDefaultDuskRecipient: false,
    validate: validatePhoenixPaymentEndpoint,
  },
  dusk_contract: {
    key: 'dusk_contract',
    label: 'Dusk contract',
    visibility: 'public',
    maxBytes: 66,
    defaultTtlSeconds: 300,
    eligibleForPrimaryName: false,
    eligibleForDefaultDuskRecipient: false,
    validate: validateDuskContract,
  },
  dusk_asset: {
    key: 'dusk_asset',
    label: 'Dusk asset',
    visibility: 'public',
    maxBytes: 128,
    defaultTtlSeconds: 300,
    eligibleForPrimaryName: false,
    eligibleForDefaultDuskRecipient: false,
    validate: validateOpaqueIdentifier,
  },
  evm_address: {
    key: 'evm_address',
    label: 'DuskEVM Address',
    visibility: 'public',
    maxBytes: 42,
    defaultTtlSeconds: 300,
    eligibleForPrimaryName: false,
    eligibleForDefaultDuskRecipient: false,
    validate: validateEvmAddress,
  },
  'address.btc': {
    key: 'address.btc',
    label: 'Bitcoin address',
    visibility: 'public',
    maxBytes: 90,
    defaultTtlSeconds: 300,
    eligibleForPrimaryName: false,
    eligibleForDefaultDuskRecipient: false,
    validate: validateBitcoinAddress,
    normalize: normalizeBitcoinAddress,
  },
  'address.eth': {
    key: 'address.eth',
    label: 'Ethereum address',
    visibility: 'public',
    maxBytes: 42,
    defaultTtlSeconds: 300,
    eligibleForPrimaryName: false,
    eligibleForDefaultDuskRecipient: false,
    validate: validateEthereumAddress,
    normalize: checksumEthereumAddress,
  },
  'address.sol': {
    key: 'address.sol',
    label: 'Solana address',
    visibility: 'public',
    maxBytes: 44,
    defaultTtlSeconds: 300,
    eligibleForPrimaryName: false,
    eligibleForDefaultDuskRecipient: false,
    validate: validateSolanaAddress,
  },
  'address.evm': {
    key: 'address.evm',
    label: 'EVM address',
    visibility: 'public',
    maxBytes: 42,
    defaultTtlSeconds: 300,
    eligibleForPrimaryName: false,
    eligibleForDefaultDuskRecipient: false,
    validate: validateEthereumAddress,
    normalize: checksumEthereumAddress,
  },
  website: {
    key: 'website',
    label: 'Website',
    visibility: 'public',
    maxBytes: HTTPS_URL_MAX_BYTES,
    defaultTtlSeconds: 3600,
    eligibleForPrimaryName: false,
    eligibleForDefaultDuskRecipient: false,
    validate: validateHttpsUrl,
  },
  avatar: {
    key: 'avatar',
    label: 'Avatar',
    visibility: 'public',
    maxBytes: HTTPS_URL_MAX_BYTES,
    defaultTtlSeconds: 3600,
    eligibleForPrimaryName: false,
    eligibleForDefaultDuskRecipient: false,
    validate: validateDisplayUri,
  },
  content_pointer: {
    key: 'content_pointer',
    label: 'Content pointer',
    visibility: 'public',
    maxBytes: HTTPS_URL_MAX_BYTES,
    defaultTtlSeconds: 3600,
    eligibleForPrimaryName: false,
    eligibleForDefaultDuskRecipient: false,
    validate: validateContentPointer,
  },
  attestation_ref: {
    key: 'attestation_ref',
    label: 'Attestation reference',
    visibility: 'public',
    maxBytes: OPAQUE_REF_MAX_BYTES,
    defaultTtlSeconds: 3600,
    eligibleForPrimaryName: false,
    eligibleForDefaultDuskRecipient: false,
    validate: validateOpaqueReference,
  },
  compliance_ref: {
    key: 'compliance_ref',
    label: 'Compliance reference',
    visibility: 'public',
    maxBytes: OPAQUE_REF_MAX_BYTES,
    defaultTtlSeconds: 3600,
    eligibleForPrimaryName: false,
    eligibleForDefaultDuskRecipient: false,
    validate: validateComplianceReference,
  },
}

export const STATIC_RECORD_DEFINITIONS: RecordDefinition[] = Object.values(staticDefinitions)

export function getRecordDefinition(key: ResolverRecordKey): RecordDefinition | undefined {
  if (isStaticRecordKey(key)) return staticDefinitions[key]
  if (isTextRecordKey(key)) return createTextRecordDefinition(key)
  if (isServiceEndpointRecordKey(key)) return createServiceEndpointDefinition(key)
  return undefined
}

// Social profile records. The frozen resolver takes any key of 1-64 UTF-8 bytes, and the SDK reads
// `text.*` values as nonblank text without control characters. These keys and formats are this
// app's conventions on top of that: a handle or invite where the service has one, else a link.
export const SOCIAL_RECORD_KEYS = ['text.x', 'text.discord', 'text.github', 'text.link'] as const
export type SocialRecordKey = (typeof SOCIAL_RECORD_KEYS)[number]

const X_HANDLE = /^@?([A-Za-z0-9_]{1,15})$/
const GITHUB_NAME = /^[A-Za-z0-9](?:-?[A-Za-z0-9])*$/
const DISCORD_INVITE = /^(?:https:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite)\/([A-Za-z0-9-]{2,32})\/?$/i
const DISCORD_USERNAME = /^(?!.*\.\.)[a-z0-9_.]{2,32}$/

function httpsLink(value: string) {
  if (/\s/.test(value)) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? url : null
  } catch {
    return null
  }
}

function socialRecordIssue(key: ResolverRecordKey, value: string) {
  if (key === 'text.x') return X_HANDLE.test(value) ? null : 'Enter an X handle: up to 15 letters, numbers or underscores.'
  if (key === 'text.github') return GITHUB_NAME.test(value) && value.length <= 39 ? null : 'Enter a GitHub user or organization name.'
  if (key === 'text.discord') return DISCORD_INVITE.test(value) || DISCORD_USERNAME.test(value) ? null : 'Enter a Discord invite link, like discord.gg/name, or a Discord username.'
  if (key === 'text.link') return httpsLink(value) ? null : 'Use a valid HTTPS URL.'
  return null
}

/** Where a social record links to, or null for a value that isn't in its expected format. */
export function socialRecordLink(key: ResolverRecordKey, value: string): { href: string; text: string } | null {
  const trimmed = value.trim()
  if (key === 'text.x') {
    const handle = X_HANDLE.exec(trimmed)?.[1]
    return handle ? { href: `https://x.com/${handle}`, text: `@${handle}` } : null
  }
  if (key === 'text.github') return GITHUB_NAME.test(trimmed) && trimmed.length <= 39 ? { href: `https://github.com/${trimmed}`, text: trimmed } : null
  if (key === 'text.discord') {
    const invite = DISCORD_INVITE.exec(trimmed)?.[1]
    return invite ? { href: `https://discord.gg/${invite}`, text: `discord.gg/${invite}` } : null
  }
  if (key === 'text.link') {
    const url = httpsLink(trimmed)
    return url ? { href: url.href, text: trimmed.replace(/^https:\/\//i, '').replace(/\/$/, '') } : null
  }
  return null
}

export function validateRecordValue(key: ResolverRecordKey, value: string): string[] {
  const unicodeError = unicodeInputError(key, 'Record key') ?? unicodeInputError(value, 'Record value')
  if (unicodeError) return [unicodeError]
  const messages = {
    invalid_address: 'Enter a valid address.',
    invalid_url: 'Use a valid HTTPS URL.',
    invalid_reference: 'Enter a valid reference.',
    invalid_text: 'Enter valid text.',
    invalid_identifier: 'Enter a valid identifier.',
    key_bytes: 'Use a key of 1–64 bytes.',
    value_bytes: 'Use a value of 1–512 bytes.',
    ttl: 'Use a TTL of 1–86400 seconds.',
  }
  const issues = validateFrozenRecord(key, value).map((code) => messages[code])
  const social = issues.length ? null : socialRecordIssue(key, value)
  return social ? [social] : issues
}

export function createResolverRecord(
  key: ResolverRecordKey,
  value: string,
  updatedAt: string = new Date().toISOString(),
): ResolverRecord {
  const definition = getRecordDefinition(key)

  if (!definition) {
    throw new Error(`Unsupported resolver record key: ${key}`)
  }

  const errors = validateRecordValue(key, value)

  if (errors.length > 0) {
    throw new Error(errors.join(' '))
  }

  return {
    key,
    value: definition.normalize?.(value) ?? value,
    visibility: definition.visibility,
    updatedAt,
    ttlSeconds: definition.defaultTtlSeconds,
  }
}

export function encodeResolverRecord(record: ResolverRecord): string {
  return JSON.stringify({
    version: 1,
    key: record.key,
    value: record.value,
    visibility: record.visibility,
    updatedAt: record.updatedAt,
    ttlSeconds: record.ttlSeconds,
  } satisfies EncodedResolverRecord)
}

export function decodeResolverRecord(encoded: string): ResolverRecord {
  const parsed = JSON.parse(encoded) as Partial<EncodedResolverRecord>

  if (parsed.version !== 1) {
    throw new Error('Unsupported resolver record encoding version.')
  }

  if (
    !parsed.key ||
    !parsed.value ||
    !parsed.visibility ||
    !parsed.updatedAt ||
    parsed.ttlSeconds === undefined
  ) {
    throw new Error('Resolver record encoding is missing required fields.')
  }

  if (!RECORD_VISIBILITIES.includes(parsed.visibility)) {
    throw new Error('Resolver record visibility is unsupported.')
  }

  const errors = validateRecordValue(parsed.key, parsed.value)

  if (errors.length > 0) {
    throw new Error(errors.join(' '))
  }

  return {
    key: parsed.key,
    value: parsed.value,
    visibility: parsed.visibility,
    updatedAt: parsed.updatedAt,
    ttlSeconds: parsed.ttlSeconds,
  }
}

function isStaticRecordKey(key: ResolverRecordKey): key is StaticRecordKey {
  return key in staticDefinitions
}

function isTextRecordKey(key: ResolverRecordKey): key is `text.${string}` {
  return /^text\.[a-z0-9_:-]{1,40}$/.test(key)
}

function isServiceEndpointRecordKey(key: ResolverRecordKey): key is `service_endpoint.${string}` {
  return /^service_endpoint\.[a-z0-9_-]{1,40}$/.test(key)
}

const TEXT_RECORD_LABELS: Partial<Record<`text.${string}`, string>> = { 'text.x': 'X', 'text.discord': 'Discord', 'text.github': 'GitHub', 'text.link': 'Link' }

// A text record is named after its key, such as Description for text.description.
function textRecordLabel(key: `text.${string}`) {
  const words = key.slice('text.'.length).replace(/[._:-]+/g, ' ')
  return TEXT_RECORD_LABELS[key] ?? words.charAt(0).toUpperCase() + words.slice(1)
}

function createTextRecordDefinition(key: `text.${string}`): RecordDefinition {
  return {
    key,
    label: textRecordLabel(key),
    visibility: 'public',
    maxBytes: TEXT_MAX_BYTES,
    defaultTtlSeconds: 3600,
    eligibleForPrimaryName: false,
    eligibleForDefaultDuskRecipient: false,
    validate: validatePublicText,
  }
}

function createServiceEndpointDefinition(key: `service_endpoint.${string}`): RecordDefinition {
  return {
    key,
    label: key,
    visibility: 'public',
    maxBytes: HTTPS_URL_MAX_BYTES,
    defaultTtlSeconds: 3600,
    eligibleForPrimaryName: false,
    eligibleForDefaultDuskRecipient: false,
    validate: validateHttpsUrl,
  }
}

function validateMoonlightAddress(value: string) {
  if (/^dusk1[a-z0-9]{20,127}$/.test(value)) return []
  if (/^[1-9A-HJ-NP-Za-km-z]{32,160}$/.test(value)) return []
  return ['Dusk addresses must use a dusk1-prefixed address or Dusk account address form.']
}

function validatePhoenixPaymentEndpoint(value: string) {
  if (/^[A-Za-z0-9:_-]{32,256}$/.test(value)) return []
  return [
    'Dusk Shielded Addresses must be explicit wallet-approved receive addresses, not profile identity fields.',
  ]
}

function validateDuskContract(value: string) {
  if (/^0x[a-fA-F0-9]{64}$/.test(value)) return []
  return ['Dusk contract IDs must be 32-byte hex strings formatted as 0x + 64 hex characters.']
}

function validateEvmAddress(value: string) {
  if (/^0x[a-fA-F0-9]{40}$/.test(value)) return []
  return ['DuskEVM Addresses must be 20-byte hex strings formatted as 0x + 40 hex characters.']
}

function validateHttpsUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? [] : ['URLs must use HTTPS.']
  } catch {
    return ['Value must be a valid HTTPS URL.']
  }
}

function validateDisplayUri(value: string) {
  if (value.startsWith('ipfs://') || value.startsWith('ar://')) return []
  return validateHttpsUrl(value)
}

function validateContentPointer(value: string) {
  if (/^ipfs:\/\/[a-zA-Z0-9]+/.test(value) || /^bafy[a-zA-Z0-9]+$/.test(value)) return []
  return validateDisplayUri(value)
}

function validateOpaqueIdentifier(value: string) {
  if (/^[A-Za-z0-9:._-]{3,128}$/.test(value)) return []
  return [
    'Identifier must be 3-128 visible characters using letters, numbers, colon, dot, underscore, or hyphen.',
  ]
}

function validateOpaqueReference(value: string) {
  if (/^(https:\/\/|urn:|dusk:)[^\s]{3,512}$/.test(value)) return []
  return ['Reference must be an HTTPS URL, URN, or dusk: reference without whitespace.']
}

function validateComplianceReference(value: string) {
  return validateOpaqueReference(value)
}

function validatePublicText(value: string) {
  if (value.trim().length === 0) return ['Text records cannot be empty.']
  if (
    [...value].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0
      return codePoint < 32 || codePoint === 127
    })
  ) {
    return ['Text records cannot contain control characters.']
  }
  return []
}
