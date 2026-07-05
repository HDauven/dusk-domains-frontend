import type { DuskDomainTxState } from '../../names/internal'
import {
  isReadOnlyWalletMessage,
  isRevealTooEarlyMessage,
  userFacingMessageFromText,
} from '../../names/internal'

export function txStatusCopy(status: DuskDomainTxState['status'] | undefined, message = '') {
  if (status === 'preparing') return 'Preparing request'
  if (status === 'awaiting_approval') return 'Awaiting approval'
  if (status === 'submitted') return 'Transaction submitted'
  if (status === 'executing') return 'Confirming transaction'
  if (status === 'executed') return 'Transaction confirmed'
  if (status === 'failed' && isReadOnlyWalletMessage(message)) return 'Wallet is read-only'
  if (status === 'failed' && isRevealTooEarlyMessage(message)) return 'Still waiting'
  if (status === 'failed') return 'Transaction failed'
  if (status === 'rejected') return 'Approval rejected'
  if (status === 'timeout') return 'Transaction timed out'
  return 'Complete registration'
}

export function userFacingTxMessage(state: DuskDomainTxState) {
  const message = state.message?.trim() ?? ''
  if (!message) return ''
  if (isReadOnlyWalletMessage(message)) {
    return 'This wallet can preview domains but cannot submit transactions.'
  }
  if (isRevealTooEarlyMessage(message)) {
    return 'Your reservation is still settling. Try again after a few more blocks.'
  }
  if (state.status === 'rejected') return 'The wallet request was rejected.'
  if (state.status === 'timeout') return 'This is taking longer than expected. Refresh My Domains before trying again.'
  return userFacingMessageFromText(message, 'The wallet could not complete this request. Refresh and try again.')
}

export function txStatusDataAttrs(state: DuskDomainTxState) {
  return {
    'data-contract': state.call?.contract,
    'data-function-name': state.call?.functionName,
  }
}

