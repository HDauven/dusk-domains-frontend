// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { nightCardIdentity } from '../../features/search/night-card/nightCardIdentity'
import { NameAvatar } from './NameAvatar'

let root: Root
let host: HTMLElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  host = document.createElement('div')
  root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals() })
const settle = () => act(async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setTimeout(resolve, 0)) })

it('shows the same animal as the name\'s Night Card when it has no avatar', async () => {
  await act(async () => root.render(<NameAvatar name="maya.dusk" size={40} />))
  await settle()
  const { animal } = await nightCardIdentity('maya.dusk')
  const mark = host.querySelector('.name-avatar.animal') as HTMLElement
  expect(mark.dataset.animal).toBe(animal)
  expect(mark.style.getPropertyValue('--animal')).toBe(`url(/night-cards/avatars/${animal}.webp)`)
  expect(host.textContent).toBe('')
})

it('prefers the name\'s own avatar, and falls back to its animal if the image fails', async () => {
  await act(async () => root.render(<NameAvatar name="maya.dusk" src="https://example.com/maya.png" />))
  const image = host.querySelector('img')!
  expect(image.getAttribute('src')).toBe('https://example.com/maya.png')
  await act(async () => { image.dispatchEvent(new Event('error')) })
  await settle()
  expect(host.querySelector('img')).toBeNull()
  expect(host.querySelector('.name-avatar.animal')).not.toBeNull()
})

it('has an avatar for every Night Card animal', async () => {
  const { default: cardAnimals } = await import('../../features/search/night-card/animals.json')
  const files = Object.keys(import.meta.glob('../../../public/night-cards/avatars/*.webp'))
  for (const animal of Object.keys(cardAnimals)) expect(files).toContain(`../../../public/night-cards/avatars/${animal}.webp`)
})
