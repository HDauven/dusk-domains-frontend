import { brandWatchList } from './brandWatchList'

const labels: ReadonlySet<string> = new Set(brandWatchList)

export function watchedBrand(name: string): string | null {
  const label = name.toLowerCase().replace(/\.dusk$/, '')
  return labels.has(label) ? label : null
}
