// App presentation / HTTP view model, ported from SDK 0.2.0 (MIT).
import type { DuskDomainsErrorCode, DuskDomainsResult } from './results'

export function success<T>(value: T): DuskDomainsResult<T> {
  return { ok: true, value }
}

export function failure<T>(code: DuskDomainsErrorCode, message: string): DuskDomainsResult<T> {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  }
}
