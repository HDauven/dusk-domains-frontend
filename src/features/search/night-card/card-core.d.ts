export type Animal = 'owl' | 'bat' | 'fox' | 'wolf' | 'moth' | 'hedgehog' | 'raccoon' | 'cat' | 'heron' | 'tarsier' | 'gecko' | 'frog'
export type Facet = { p: number[][]; t?: number }
export type Art = { href: string; w: number; h: number; height: number; lift?: number }
export const ANIMALS: Animal[]
export const TAGS: { animal: string; sky: string }
export function jump(key: bigint, buckets: number): number
export function animalFor(key: bigint): Animal
export function stream(key: bigint): () => number
export function nameStar(nodeHex: string): { x: number; y: number }
export function constellation(facets: Facet[], options: {
  cx: number; bottom: number; maxW: number; maxH: number; jitter: number
  rotate: number; rand: () => number; mirror?: boolean; lineOpacity?: number
}): string
export const LAYOUT: {
  nameY: number; nameMax: number; nameMin: number; nameWidth: number
  animalX: number; animalScale: number; sink: number
  stars: { cx: number; bottom: number; maxW: number; maxH: number }
}
export function nameSizeFor(widthAt110: number): number
export function starCardSvg(options: {
  label: string; nodeHex: string; skyKey: bigint; facets: Facet[]; art: Art; nameSize?: number
}): string
