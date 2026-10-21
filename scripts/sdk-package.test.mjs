import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

// SDK 0.5.3 from its local pack until it is on JSR; then npm:@jsr/duskdomains__sdk@0.5.3 from npm.jsr.io.
it('installs the exact SDK release, 0.5.3 from its local pack', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
  expect(pkg.dependencies['@duskdomains/sdk']).toBe('file:../sdk-pack053/duskdomains-sdk-0.5.3.tgz')
  expect(lock.packages['node_modules/@duskdomains/sdk']).toMatchObject({
    version: '0.5.3',
    resolved: 'file:../sdk-pack053/duskdomains-sdk-0.5.3.tgz',
    integrity: expect.stringMatching(/^sha512-/),
  })
  expect(readFileSync('.npmrc', 'utf8')).toContain('@jsr:registry=https://npm.jsr.io')
})
