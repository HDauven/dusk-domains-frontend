// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { Markdown } from './Markdown'

const render = (source: string) => renderToStaticMarkup(<Markdown source={source} />)
function read(source: string) {
  const container = document.createElement('div')
  container.innerHTML = render(source)
  return container
}

it('renders headings, paragraphs, bold, code and unordered lists', () => {
  const page = read('# Title\n\nFirst **paragraph** with `.dusk`.\nContinued here.\n\n## Section\n\n- **First** item\n- Second `item`\n\nLast paragraph.')
  expect([...page.children].map(element => element.tagName)).toEqual(['H1', 'P', 'H2', 'UL', 'P'])
  expect(page.querySelector('h1')?.textContent).toBe('Title')
  expect(page.querySelector('h2')?.textContent).toBe('Section')
  expect(page.querySelector('p')?.textContent).toBe('First paragraph with .dusk. Continued here.')
  expect(page.querySelector('p strong')?.textContent).toBe('paragraph')
  expect(page.querySelector('p code')?.textContent).toBe('.dusk')
  expect([...page.querySelectorAll('li')].map(item => item.textContent)).toEqual(['First item', 'Second item'])
  expect(page.querySelector('li strong')?.textContent).toBe('First')
  expect(page.querySelector('li code')?.textContent).toBe('item')
  expect(page.lastElementChild?.textContent).toBe('Last paragraph.')
})

it('handles adjacent blocks and CRLF without adding Markdown features', () => {
  expect(render('# Title\r\nParagraph\r\n## Section\r\n- Item\r\n\r\n### Literal\r\n\r\n*literal*'))
    .toBe('<h1>Title</h1><p>Paragraph</p><h2>Section</h2><ul><li>Item</li></ul><p>### Literal</p><p>*literal*</p>')
  expect(render('')).toBe('')
  expect(read('`**literal**`').querySelector('code')?.textContent).toBe('**literal**')
})

it('escapes HTML and entities in every text construct', () => {
  const html = '<span title="quoted">A & B</span>'
  const page = read(`# ${html}\n\n## ${html}\n\n${html}\n\n**${html}** and \`${html}\`\n\n- ${html}\n\n[${html}](https://example.com/?a=1&b=2)`)
  expect(page.querySelector('span')).toBeNull()
  expect(page.querySelector('strong')?.textContent).toBe(html)
  expect(page.querySelector('code')?.textContent).toBe(html)
  expect(page.querySelector('a')?.textContent).toBe(html)
  expect(page.querySelector('a')?.getAttribute('href')).toBe('https://example.com/?a=1&b=2')
  expect(render(html)).toContain('&lt;span title=&quot;quoted&quot;&gt;A &amp; B&lt;/span&gt;')
  expect(read('&lt;span&gt;').textContent).toBe('&lt;span&gt;')
})

it.each(['https://example.com/path', 'http://example.com/path'])('opens external http(s) links safely: %s', href => {
  const link = read(`[Example](${href})`).querySelector('a')!
  expect(link.getAttribute('href')).toBe(href)
  expect(link.target).toBe('_blank')
  expect(link.rel).toBe('noreferrer')
})

it.each(['/privacy', './terms', '#contact', '?section=terms', `${window.location.origin}/terms`])('keeps same-site links in the current tab: %s', href => {
  const link = read(`[Here](${href})`).querySelector('a')!
  expect(link.getAttribute('href')).toBe(href)
  expect(link.hasAttribute('target')).toBe(false)
})

it.each(['javascript:void(0)', 'JaVaScRiPt:void(0)', 'data:text/plain,hello', 'mailto:person@example.com', 'tel:123', 'ftp://example.com', 'file:///tmp/file', 'blob:https://example.com/id', '//example.com/path', 'https://[invalid'])('leaves unsupported or invalid links as text: %s', href => {
  const source = `[Example](${href})`
  const page = read(source)
  expect(page.querySelector('a')).toBeNull()
  expect(page.textContent).toBe(source)
})
