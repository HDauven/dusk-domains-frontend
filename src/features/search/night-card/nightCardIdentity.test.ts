import { expect, it } from 'vitest'
import vectors from './__fixtures__/vectors.json'
import { nightCardIdentity } from './nightCardIdentity'
import { ANIMALS } from './card-core.js'
import animals from './animals.json'

it.each(vectors)('matches the canonical node, animal, sky seed and home-sky star for $name', async vector => {
  const card = await nightCardIdentity(vector.name)
  expect(card.nodeHex).toBe(vector.node)
  expect(card.animal).toBe(vector.animal)
  expect(card.skyKey.toString()).toBe(vector.skyKey)
  expect({ x: Number(card.star.x.toFixed(3)), y: Number(card.star.y.toFixed(3)) }).toEqual(vector.star)
})

it('preserves the frozen animal order and supplies every animal', () => {
  expect(ANIMALS).toEqual(['owl', 'bat', 'fox', 'wolf', 'moth', 'hedgehog', 'raccoon', 'cat', 'heron', 'tarsier', 'gecko', 'frog'])
  expect(Object.keys(animals)).toEqual(ANIMALS)
})
