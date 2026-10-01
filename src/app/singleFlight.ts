function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

export type RefreshOptions = { fresh?: boolean }

// Readers share only requests for the same scope. A fresh read waits for that
// scope's active read to settle; other scopes run independently.
function sameScope(a: unknown, b: unknown) {
  return a === b || (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => value === b[index]))
}

export function createSingleFlight<T>() {
  type Job = { read: () => Promise<T>; scope: unknown; result: ReturnType<typeof deferred<T>> }
  const flights = new Set<{ active: Job; trailing: Job | null }>()
  const start = (flight: { active: Job; trailing: Job | null }) => {
    const job = flight.active
    const finish = () => {
      if (flight.trailing) {
        flight.active = flight.trailing
        flight.trailing = null
        start(flight)
      } else flights.delete(flight)
    }
    void Promise.resolve().then(job.read).then(
      value => { finish(); job.result.resolve(value) },
      error => { finish(); job.result.reject(error) },
    )
  }
  return (read: () => Promise<T>, scope: unknown, fresh = false): Promise<T> => {
    const flight = [...flights].find(flight => sameScope(scope, flight.active.scope))
    if (flight) {
      if (fresh && !flight.trailing) flight.trailing = { read, scope, result: deferred<T>() }
      return (flight.trailing ?? flight.active).result.promise
    }
    const job = { read, scope, result: deferred<T>() }
    const next = { active: job, trailing: null }
    flights.add(next)
    start(next)
    return job.result.promise
  }
}
