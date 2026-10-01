// The caller invalidates in-flight reads immediately; this only schedules the next one.
export function scheduleSearch(query: string, search: (query: string) => void, delay = 350) {
  if (!query.trim()) return () => {}
  const timer = setTimeout(() => search(query), delay)
  return () => clearTimeout(timer)
}

export function suggestedNames(name: string) {
  const label = name.replace(/\.dusk$/i, '').split('.')[0].slice(0, 55)
  return [`${label}hq.dusk`, `my${label}.dusk`, `${label}1.dusk`]
}
