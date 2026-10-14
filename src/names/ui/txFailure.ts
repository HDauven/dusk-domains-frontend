import type { DuskDomainTxState } from '../transactions'
import { userFacingMessageFromText } from './errors'

const isBytes = (value: unknown): value is ArrayBuffer | ArrayBufferView =>
  ArrayBuffer.isView(value) || Object.prototype.toString.call(value) === '[object ArrayBuffer]'

/**
 * What a failed transaction says about why it failed: the node receipt's error, which the writer puts
 * in its message, the error the wallet's wait for execution rejected with, which the writer replaces
 * with its own copy, and the wallet's receipt. Dusk Connect can pass the node's execution event
 * payload on as bytes; any bytes are read as text, at any depth, so the failure code stays visible.
 */
export function failureText(state: DuskDomainTxState) {
  let result = ''
  try {
    result = typeof state.result === 'string' ? state.result
      : JSON.stringify(state.result ?? null, (_, value: unknown) => typeof value === 'bigint' ? String(value)
        : isBytes(value) ? new TextDecoder().decode(value) : value) ?? ''
  } catch { /* A receipt that can't be read carries no failure code. */ }
  const error = state.error instanceof Error ? state.error.message : typeof state.error === 'string' ? state.error : ''
  return `${state.message ?? ''} ${error} ${result}`
}

/** Why the chain refused a call, in that call's words, wherever the failure names its code; else the writer's message. */
export function refusalReason(state: DuskDomainTxState, functionName: string) {
  const code = /\bDuskDS:v\d+:\w+\b/.exec(failureText(state))?.[0]
  return code ? userFacingMessageFromText(code, '', { functionName }) : state.message ?? ''
}
