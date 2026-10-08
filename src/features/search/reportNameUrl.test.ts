import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { expect, it } from 'vitest'
import { createDuskDomainsRuntimeConfig } from '../../names/config'
import { reportNameUrl } from './reportNameUrl'

const { yaml } = createRequire(import.meta.url)('playwright-core/lib/utilsBundle')
const destination = 'https://github.com/HDauven/dusk-domains-frontend/issues/new?template=abuse-report.yml&labels=abuse&name=old&title=old'

it('prefills the configured GitHub form using the actual template name field and title', () => {
  const form = yaml.parse(readFileSync('.github/ISSUE_TEMPLATE/abuse-report.yml', 'utf8'))
  const field = form.body.find((item: { type: string, attributes: { label?: string } }) => item.type === 'input' && item.attributes.label === 'Name')
  expect(field.id).toBe('name')
  const config = createDuskDomainsRuntimeConfig({ VITE_DUSK_DOMAINS_ABUSE_URL: destination })
  const url = new URL(reportNameUrl(config.launchLinks.abuse, 'mail.google.dusk')!)
  expect(url.origin + url.pathname).toBe('https://github.com/HDauven/dusk-domains-frontend/issues/new')
  expect(Object.fromEntries(url.searchParams)).toEqual({ template: 'abuse-report.yml', labels: 'abuse', title: `${form.title}mail.google.dusk`, [field.id]: 'mail.google.dusk' })
})

it('prefills email while keeping the configured body and recipient', () => {
  const url = new URL(reportNameUrl('mailto:abuse@example.test?body=Please%20describe%20the%20issue.', 'google.dusk')!)
  expect(url.pathname).toBe('abuse@example.test')
  expect(url.href).not.toContain('+')
  expect(url.searchParams.get('subject')).toBe('[Abuse]: google.dusk')
  expect(url.searchParams.get('body')).toBe('Name: google.dusk\n\nPlease describe the issue.')
})

it.each(['https://forms.example.test/report?form=abuse', '/contact?topic=abuse', 'https://github.com/HDauven/dusk-domains-frontend/issues'])('preserves a custom destination with unknown fields: %s', url => {
  expect(reportNameUrl(url, 'google.dusk')).toBe(url)
})

it('omits a report link when no destination is configured', () => {
  expect(reportNameUrl(null, 'google.dusk')).toBeNull()
  expect(reportNameUrl('', 'google.dusk')).toBeNull()
})

it('keeps a plus sign in the mail address while encoding spaces in the message', () => {
  const href = reportNameUrl('mailto:abuse+domains@example.test', 'google.dusk')!
  expect(href.startsWith('mailto:abuse+domains@example.test?')).toBe(true)
  expect(href).not.toContain('+domains'.replace('+', '%20'))
  expect(href).toContain('subject=%5BAbuse%5D%3A%20google.dusk')
})
