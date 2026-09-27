export function abbreviate(value: string) {
  if (value.length <= 18) return value
  return `${value.slice(0, 10)}...${value.slice(-6)}`
}


export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural
}

export function formatDusk(value: number) {
  return Number.isInteger(value) ? value.toLocaleString('en') : value.toLocaleString('en', { maximumFractionDigits: 2 })
}
