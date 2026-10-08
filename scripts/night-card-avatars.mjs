#!/usr/bin/env node
// Crops each Night Card animal to a small square avatar: its head (or, for the moth and bat, the
// wings that make it recognisable). NameAvatar shows these on the name's own dusk circle wherever
// a name has no avatar of its own. Run `npm run avatars` after changing an animal or a crop.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SIZE = 128

// [x, y, side] of the square to keep, in the source image's pixels.
export const AVATAR_CROPS = {
  owl: [45, 8, 350],
  bat: [200, 0, 320],
  fox: [330, 0, 340],
  wolf: [318, 0, 336],
  moth: [60, 0, 640],
  hedgehog: [350, 20, 370],
  raccoon: [40, 0, 440],
  cat: [290, 0, 261],
  heron: [371, 0, 330],
  tarsier: [10, 0, 527],
  gecko: [430, 0, 290],
  frog: [340, 0, 370],
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = resolve(root, 'public/night-cards/avatars')
  mkdirSync(out, { recursive: true })
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
  const page = await browser.newPage()
  for (const [animal, [x, y, side]] of Object.entries(AVATAR_CROPS)) {
    const source = `data:image/webp;base64,${readFileSync(resolve(root, `public/night-cards/${animal}.webp`)).toString('base64')}`
    const webp = await page.evaluate(async ({ source, x, y, side, size }) => {
      const image = new Image()
      image.src = source
      await image.decode()
      const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size })
      const context = canvas.getContext('2d')
      context.imageSmoothingQuality = 'high'
      context.drawImage(image, x, y, side, side, 0, 0, size, size)
      return canvas.toDataURL('image/webp', 0.82).split(',')[1]
    }, { source, x, y, side, size: SIZE })
    const bytes = Buffer.from(webp, 'base64')
    writeFileSync(resolve(out, `${animal}.webp`), bytes)
    console.log(animal, `${Math.round(bytes.length / 1024)} KB`)
  }
  await browser.close()
}
