import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { parseEnv } from 'node:util'
import { expect, it } from 'vitest'

// Reuse the YAML parser bundled with our existing browser test tooling.
const { yaml } = createRequire(import.meta.url)('playwright-core/lib/utilsBundle')
const dir = '.github/ISSUE_TEMPLATE'
const read = name => yaml.parse(readFileSync(`${dir}/${name}`, 'utf8'))
const repo = 'https://github.com/HDauven/dusk-domains-frontend'

it('offers a feature request form like the support form, with a public-data safety check', () => {
  const form = read('feature-request.yml')
  expect(form).toMatchObject({ name: 'Feature request', title: '[Feature]: ' })
  const field = id => form.body.find(item => item.id === id)
  expect(field('area')).toMatchObject({ type: 'dropdown', validations: { required: true } })
  expect(field('area').attributes.options.at(-1)).toBe('Something else')
  expect(field('request')).toMatchObject({ type: 'textarea', validations: { required: true } })
  expect(field('safety')).toMatchObject({
    type: 'checkboxes',
    attributes: { options: [{ label: expect.stringMatching(/personal data, a recovery phrase, private key/), required: true }] },
  })
  expect(form.body.find(item => item.type === 'markdown').attributes.value).toContain('This request is public.')
})

it.each(['mainnet', 'testnet'])('sends %s visitors to forms that exist, and security reports to private reporting', network => {
  const env = parseEnv(readFileSync(`.env.${network}.example`, 'utf8'))
  // Support opens the chooser: the support, feature and abuse forms, and the private security report.
  expect(env.VITE_DUSK_DOMAINS_SUPPORT_URL).toBe(`${repo}/issues/new/choose`)
  expect(readdirSync(dir).filter(name => name !== 'config.yml').sort()).toEqual(['abuse-report.yml', 'feature-request.yml', 'support-request.yml'])
  for (const name of ['abuse-report.yml', 'feature-request.yml', 'support-request.yml']) expect(read(name).body.length).toBeGreaterThan(0)
  expect(read('config.yml').contact_links).toEqual([expect.objectContaining({ url: `${repo}/security/advisories/new` })])
  // Report this name prefills the abuse form.
  expect(env.VITE_DUSK_DOMAINS_ABUSE_URL).toBe(`${repo}/issues/new?template=abuse-report.yml`)
  expect(env.VITE_DUSK_DOMAINS_SECURITY_URL).toBe(`${repo}/security/advisories/new`)
})

it('has no privacy request form: a public issue would expose the data it is about', () => {
  expect(existsSync(`${dir}/privacy-request.yml`)).toBe(false)
  const config = readFileSync(`${dir}/config.yml`, 'utf8')
  expect(config).not.toMatch(/privacy/i)
  expect(read('config.yml').blank_issues_enabled).toBe(true)
})
