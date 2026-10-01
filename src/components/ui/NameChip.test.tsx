import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { NameChip, NameSignature } from './NameChip'
import { ListingName } from '../../features/marketplace/ListingName'
import { NameHeader } from '../../features/search/NameHeader'

it.each(['aurora', 'dryrun1707', 't202after', 'abcdefghijklmnopqrstuvwx', 'w'.repeat(63)])('keeps %s separate from the suffix with one explicit break opportunity', label => {
  const html = renderToStaticMarkup(<NameSignature name={`${label}.dusk`} />)
  expect(html).toContain(`<span class="name-signature-label">${label}</span><wbr/><em>.dusk</em>`)
  expect(html.match(/<wbr/g)).toHaveLength(1)
  expect(html.replace(/<[^>]*>/g, '')).toBe(`${label}.dusk`)
})

it('keeps names without a suffix intact', () => {
  const html = renderToStaticMarkup(<NameSignature name="aurora" />)
  expect(html).toContain('<span class="name-signature-label">aurora</span>')
  expect(html).not.toContain('<wbr')
  expect(html).not.toContain('<em>')
})

it.each([
  ['chips', <NameChip name="dryrun1707.dusk" />],
  ['market listings', <ListingName name="dryrun1707.dusk" />],
  ['unregistered name headers', <NameHeader displayName="dryrun1707.dusk" lifecycleLabel={null} primaryVerified={false} records={[]} reserved={false} status="available" />],
])('uses the shared signature in %s', (_, element) => {
  expect(renderToStaticMarkup(element)).toContain('<span class="name-signature-label">dryrun1707</span><wbr/><em>.dusk</em>')
})
