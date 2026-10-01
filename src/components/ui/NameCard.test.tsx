import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { NameCard } from './NameCard'

it('keeps a clickable card\'s warnings in its accessible description', () => {
  const html = renderToStaticMarkup(<NameCard name="aurora.dusk" onOpen={() => {}}><span>Pays another wallet</span></NameCard>)
  const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1]
  expect(describedBy).toBeTruthy()
  expect(html).toMatch(new RegExp(`id="${describedBy}"[^>]*>[\\s\\S]*Pays another wallet`))
})
