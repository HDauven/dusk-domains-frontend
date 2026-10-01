// A name read stays current until a newer one starts. Start it before the first request
// and check it after every await, so a slow earlier read can't overwrite a newer name.
export function createNameReadGuard() {
  let generation = 0
  return () => {
    const current = ++generation
    return () => generation === current
  }
}
