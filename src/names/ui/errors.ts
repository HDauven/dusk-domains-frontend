// App presentation / HTTP view model, ported from SDK 0.2.0 (MIT).
const defaultErrorMessage = 'The request could not be completed. Refresh and try again.'

/** The store's refusal while registrations are paused, suspended or closed by the policy. */
export const REGISTRATIONS_CLOSED_MESSAGE = 'Registrations are closed right now. Try again when they reopen.'
/** A market's refusal of a new order or bid while it is paused or no longer the listed market. */
export const MARKET_CLOSED_MESSAGE = 'This market isn’t taking new orders right now. Existing orders can still be completed or cancelled.'
// Calls a market refuses with Closed while it is paused or no longer the listed market.
const marketOrderCalls = new Set(['escrow_fixed_sale', 'escrow_auction', 'place_offer', 'place_bid'])

/** What the failed request was, where its refusal means different things for different calls. */
export type ErrorContext = { functionName?: string }

// set_primary and clear_primary refusals, in the words of the call that met them.
const primaryRefusals: Record<string, Record<string, string>> = {
  set_primary_name: {
    ForwardMismatch: 'This name’s Dusk address record isn’t this wallet’s address, so it can’t be this wallet’s primary name.',
    Unauthorized: 'Only the owner or manager of this name, connected with the wallet for its Dusk address, can make it a primary name.',
    Expired: 'This name has expired, so it can’t be a primary name. Renew it first.',
    NotFound: 'This name or its Dusk address record isn’t there anymore. Refresh and check it again.',
    Stale: 'This name changed since you reviewed it. Refresh and check it again.',
    MovePending: 'This name is moving between shards. Try again after the move finishes.',
    Moved: 'This name moved to another shard. Refresh and check it again.',
    WrongHome: 'This name moved to another shard. Refresh and check it again.',
    Capacity: 'This shard can’t keep another primary name right now. Try again later.',
  },
  clear_primary_name: {
    Unauthorized: 'Only the wallet for this Dusk address can clear its primary name.',
    NotFound: 'This Dusk address has no primary name to clear.',
    Stale: 'Your primary name changed since you reviewed it. Check it again before continuing.',
    MovePending: 'Your primary name is moving between shards. Clear it after the move finishes.',
    Moved: 'Your primary name moved to another shard. Refresh and check it again.',
    WrongHome: 'Your primary name moved to another shard. Refresh and check it again.',
  },
}

/** A quote no client verified, or a reveal its client didn't quote: nothing was sent, and quoting again fixes it. */
export const QUOTE_AGAIN_MESSAGE = 'The price needs checking again before you sign. Try again.'
/** A contract the site couldn't verify for signing, so nothing was sent. */
export const UNVERIFIED_CONTRACT_MESSAGE = 'This site couldn’t verify a Dusk Domains contract for signing, so nothing was sent. Refresh and try again.'

export function userFacingErrorMessage(error: unknown, fallback: string = defaultErrorMessage, context: ErrorContext = {}): string {
  if (error instanceof Error && error.name === 'UnverifiedQuoteError') return QUOTE_AGAIN_MESSAGE
  if (error instanceof Error && error.name === 'UnverifiedContractError') return UNVERIFIED_CONTRACT_MESSAGE
  return userFacingMessageFromText(error instanceof Error ? error.message : String(error), fallback, context)
}

export function userFacingMessageFromText(
  message: string | undefined,
  fallback: string = defaultErrorMessage,
  context: ErrorContext = {},
): string {
  const trimmed = String(message ?? '').trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('Insufficient public DUSK for ')) return trimmed
  const refusal = /\bDuskDS:v\d+:(\w+)\b/.exec(trimmed)?.[1]
  const primary = refusal && context.functionName ? primaryRefusals[context.functionName]?.[refusal] : undefined
  if (primary) return primary
  // Closed, from a signed transaction or a read.
  if (/\bDuskDS:v\d+:Closed\b/.test(trimmed))
    return context.functionName && marketOrderCalls.has(context.functionName) ? MARKET_CLOSED_MESSAGE : REGISTRATIONS_CLOSED_MESSAGE
  const frozenMessages: Record<string, string> = {
    // These codes also refuse read-only quotes, before any wallet request, so this copy never
    // says a payment was returned. Registration says so only after a confirmed failed transaction.
    QuoteChanged: 'The registration price changed. Review the new price and try again.',
    FeeMismatch: 'The price changed. Review the new price and try again.',
    Stale: 'This name or order changed. Refresh and review it again.',
    WrongHome: 'The name moved to another shard. Refresh and try again.',
    Moved: 'The name moved to another shard. Refresh and try again.',
    MovePending: 'This name is moving between shards. Try again after the move finishes.',
    CommitmentMissing: 'The reservation is missing or expired. Reserve this name again.',
    CommitmentAge: 'The reservation is outside its reveal window. Check its current status.',
    ForwardMismatch: 'The name’s public address must match this wallet before it can be primary.',
    CustodyActive: 'Return the name from marketplace custody before making this change.',
    // A listed name's renewal through its market, after the name left that listing.
    CustodyMismatch: 'This name isn’t listed anymore, so the renewal didn’t go through.',
    // set_primary, or a registration setting a primary, while another store holds the address's link.
    PrimaryAlreadySet: 'Your Dusk address already has a primary name, kept in another shard. Clear that one first, then set this one.',
    PolicyUnavailable: 'Registration pricing is unavailable. Try again later.',
    ExternalReadFailed: 'Name data could not be verified on-chain. Refresh and try again.',
    ReferralCapacity: 'Referral rewards are temporarily unavailable for new beneficiaries.',
  }
  for (const [code, text] of Object.entries(frozenMessages)) {
    if (new RegExp(`\\b${code}\\b`).test(trimmed)) return text
  }
  // The SDK refuses a reveal from a quote that is closed or whose label is no longer public.
  if (/Quote is not open for public registration/.test(trimmed))
    return 'This name can’t be registered under the current registration rules.'
  // Blocks kept landing mid-read, after the read was tried again.
  if (/Chain tip changed during read/.test(trimmed)) return 'New blocks kept arriving while this was read. Try again.'
  // The store's quote disagreed with the placement it was read for, at every height tried.
  if (/Registration quote does not match placement and previous lifecycle/.test(trimmed))
    return 'The registration price couldn’t be confirmed on chain. Try again.'
  // Connect signs a reveal only for a quote its own client returned, as after the site replaced its client.
  if (/is not verified against this release: sign only a reveal|is not verified against this release; quote it|quote again with FrozenClient/.test(trimmed))
    return QUOTE_AGAIN_MESSAGE
  if (/absent from verified release|not a marketplace verified for this release/.test(trimmed)) return UNVERIFIED_CONTRACT_MESSAGE
  // A release without the contract's code and init commitments, as one built from env alone, can't sign for it.
  if (/has no reviewed code and init commitments in this release/.test(trimmed))
    return 'This site can show this contract but not sign for it: its deployment manifest must list the contract’s code and initialization.'
  if (/Reservation storage|Quota exceeded/.test(trimmed))
    return 'Cannot save the reservation. Enable browser storage and try again.'
  if (/^(ambiguous_principal|invalid_account|empty)$/.test(trimmed))
    return 'Enter a valid public Dusk address or an explicit contract: identifier.'
  if (/take-back batch|take-back requires/i.test(trimmed))
    return 'Choose between 1 and 256 distinct subnames to take back.'
  if (/outside ancestor namespace/i.test(trimmed))
    return 'Every selected subname must be below the name you control.'
  if (/active ancestor authority required/i.test(trimmed))
    return 'Connect the owner or manager of an active ancestor.'
  if (/active namespace authority required/i.test(trimmed))
    return 'Connect the owner or manager of this name or an active ancestor.'
  if (/owner or manager authorization required/i.test(trimmed))
    return 'Connect the owner or manager of this name.'
  if (/duplicate subname/i.test(trimmed)) return 'Select each subname only once.'
  if (isPendingCommitmentLimitMessage(trimmed))
    return 'This wallet has 16 pending reservations. Open My names to finish a reservation, or wait for one to expire before reserving another.'
  if (isReadOnlyWalletMessage(trimmed))
    return 'This wallet can preview domains but cannot submit transactions.'
  if (isInsufficientBalanceMessage(trimmed))
    return 'This wallet does not have enough DUSK to complete the transaction.'
  if (isWalletLockedMessage(trimmed)) return 'Connect or unlock your wallet to continue.'
  if (isRevealTooEarlyMessage(trimmed))
    return 'Your reservation is still settling. Try again after a few more blocks.'
  if (isRejectedWalletMessage(trimmed)) return 'The wallet request was rejected.'
  if (isNameDataUnavailableMessage(trimmed))
    return 'Domain data is not reachable right now. Refresh and try again.'
  if (isTechnicalErrorMessage(trimmed)) return fallback
  return trimmed
}

export function isReadOnlyWalletMessage(message: string | undefined): boolean {
  return /local wallet is read-only|local dev wallet cannot submit/i.test(String(message ?? ''))
}

export function isRevealTooEarlyMessage(message: string | undefined): boolean {
  return /reveal too early/i.test(String(message ?? ''))
}

export function isTechnicalErrorMessage(message: string | undefined): boolean {
  return /32-byte|DuskDS|contract calls?|contract read failed|internal server error|Invalid input|public_sender|runtime|payload|data-driver|0x[a-f0-9]{24,}/iu.test(
    String(message ?? ''),
  )
}

export function isWalletLockedMessage(message: string | undefined): boolean {
  return /wallet.*locked|locked.*wallet|site is not connected|not connected|unauthori[sz]ed/i.test(
    String(message ?? ''),
  )
}

function isInsufficientBalanceMessage(message: string): boolean {
  return /value spent larger than account holds|insufficient|not enough/i.test(message)
}

export function isRejectedWalletMessage(message: string | undefined): boolean {
  return /reject|denied|cancel/i.test(String(message ?? ''))
}

function isNameDataUnavailableMessage(message: string): boolean {
  return /indexer|failed to fetch|networkerror|connection refused|econnrefused|http 5\d\d|http 404/i.test(
    message,
  )
}

export function isPendingCommitmentLimitMessage(message: string | undefined): boolean {
  return /pending commitment limit reached|\bCommitmentLimit\b/i.test(String(message ?? ''))
}
