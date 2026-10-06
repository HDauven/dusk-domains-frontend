import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { expect, it } from 'vitest'

// Reuse the YAML parser bundled with our existing browser test tooling.
const { yaml } = createRequire(import.meta.url)('playwright-core/lib/utilsBundle')

it('provides a valid privacy request form with required details and a public-data safety check', () => {
  const form = yaml.parse(readFileSync('.github/ISSUE_TEMPLATE/privacy-request.yml', 'utf8'))
  expect(form.name).toBe('Privacy request')
  const field = id => form.body.find(item => item.id === id)
  expect(field('kind')).toMatchObject({
    type: 'dropdown',
    attributes: { options: ['Access', 'Correction', 'Deletion', 'Objection', 'Other'] },
    validations: { required: true },
  })
  expect(field('data')).toMatchObject({ type: 'input', validations: { required: true } })
  expect(field('data').attributes.placeholder).toMatch(/Server logs.*name's display in the API/)
  expect(field('description')).toMatchObject({ type: 'textarea', validations: { required: true } })
  expect(field('safety')).toMatchObject({
    type: 'checkboxes',
    attributes: { options: [{ label: expect.stringMatching(/no personal data, keys or seed phrases/), required: true }] },
  })
  const note = form.body.find(item => item.type === 'markdown').attributes.value
  expect(note).toContain('This request is public.')
  expect(note).toContain("We'll arrange a private channel if needed.")
})
