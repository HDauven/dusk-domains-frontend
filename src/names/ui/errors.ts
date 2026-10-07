// App presentation / HTTP view model, ported from SDK 0.2.0 (MIT).
const defaultErrorMessage = 'The request could not be completed. Refresh and try again.'

export function userFacingErrorMessage(error: unknown, fallback: string = defaultErrorMessage): string {
  return userFacingMessageFromText(error instanceof Error ? error.message : String(error), fallback)
}

export function userFacingMessageFromText(
  message: string | undefined,
  fallback: string = defaultErrorMessage,
): string {
  const trimmed = String(message ?? '').trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('Insufficient public DUSK for ')) return trimmed
  const frozenMessages: Record<string, string> = {
    QuoteChanged: 'The price or policy changed. Refresh and review the latest price.',
    FeeMismatch: 'The fee changed. Refresh and review the latest price.',
    Stale: 'This name or order changed. Refresh and review it again.',
    WrongHome: 'The name moved to another shard. Refresh and try again.',
    Moved: 'The name moved to another shard. Refresh and try again.',
    MovePending: 'This name is moving between shards. Try again after the move finishes.',
    CommitmentMissing: 'The reservation is missing or expired. Reserve this name again.',
    CommitmentAge: 'The reservation is outside its reveal window. Check its current status.',
    ForwardMismatch: 'The name’s public address must match this wallet before it can be primary.',
    CustodyActive: 'Return the name from marketplace custody before making this change.',
    PolicyUnavailable: 'Registration pricing is unavailable. Try again later.',
    ExternalReadFailed: 'Name data could not be verified on-chain. Refresh and try again.',
    ReferralCapacity: 'Referral rewards are temporarily unavailable for new beneficiaries.',
  }
  for (const [code, text] of Object.entries(frozenMessages)) {
    if (new RegExp(`\\b${code}\\b`).test(trimmed)) return text
  }
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
  if (/close the marketplace listing before renewing/i.test(trimmed))
    return 'Close the marketplace listing before renewing this name.'
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
  return /32-byte|DuskDS|contract calls?|Invalid input|public_sender|runtime|payload|data-driver|0x[a-f0-9]{24,}/iu.test(
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
