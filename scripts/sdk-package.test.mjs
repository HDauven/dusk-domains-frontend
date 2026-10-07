import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

it('installs the exact SDK release from JSR', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
  expect(pkg.dependencies['@duskdomains/sdk']).toBe('npm:@jsr/duskdomains__sdk@0.3.1')
  expect(lock.packages['node_modules/@duskdomains/sdk']).toMatchObject({ version: '0.3.1', resolved: expect.stringContaining('https://npm.jsr.io/') })
  expect(readFileSync('.npmrc', 'utf8')).toContain('@jsr:registry=https://npm.jsr.io')
})
