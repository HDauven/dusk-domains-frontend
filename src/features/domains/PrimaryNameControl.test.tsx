import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { PrimaryNameControl } from './PrimaryNameControl'

it('labels the primary switch and describes it separately from its checked state', () => {
  for (const verified of [false, true]) {
    const html = renderToStaticMarkup(<PrimaryNameControl canSetPrimary canClearPrimary displayName="alpha.dusk" error="" txState={null}
      primaryVerification={{ verified }} onSetPrimary={vi.fn()} onClearPrimary={vi.fn()} />)
    const labelId = html.match(/aria-labelledby="([^"]+)"/)?.[1]
    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1]
    expect(labelId).toBeTruthy()
    expect(descriptionId).toBeTruthy()
    expect(html).toContain(`<label id="${labelId}"`)
    expect(html).toContain('>Primary name</label>')
    expect(html).toContain(`<p id="${descriptionId}">${verified ? 'Apps show alpha.dusk for this Dusk address.' : 'Turn on to use alpha.dusk as the primary name for your Dusk address.'}</p>`)
    expect(html).toContain(`role="switch" aria-checked="${verified}"`)
    expect(html).not.toMatch(/>(On|Off)<\/button>/)
  }
})

it('disables only when the action for the current primary state is unavailable', () => {
  for (const verified of [false, true]) {
    for (const allowed of [false, true]) {
      const html = renderToStaticMarkup(<PrimaryNameControl canSetPrimary={verified || allowed} canClearPrimary={!verified || allowed}
        displayName="alpha.dusk" error="" txState={null} primaryVerification={{ verified }} onSetPrimary={vi.fn()} onClearPrimary={vi.fn()} />)
      expect(html.includes('disabled=""')).toBe(!allowed)
    }
  }
})


it('offers clearing for an unverified primary without enabling setting', () => {
  const html = renderToStaticMarkup(<PrimaryNameControl canClearPrimary canSetPrimary={false}
    displayName="alpha.dusk" error="" txState={null} primaryVerification={{ verified: false }}
    onClearPrimary={vi.fn()} onSetPrimary={vi.fn()} />)
  expect(html).toContain('>Clear primary name</button>')
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*role="switch"/)
  expect(html).toContain('aria-checked="false"')
})

it('says before the switch is tried that the name needs the wallet’s Dusk address, with Records one click away', () => {
  const description = (addressRecord: 'missing' | 'other' | null, onOpenRecords?: () => void) => renderToStaticMarkup(<PrimaryNameControl canSetPrimary canClearPrimary={false}
    displayName="alpha.dusk" error="" txState={null} primaryVerification={{ verified: false, addressRecord }} onSetPrimary={vi.fn()} onClearPrimary={vi.fn()}
    onOpenRecords={onOpenRecords} />).match(/<p id="[^"]+">([\s\S]*?)<\/p>/)?.[1]
  const records = '<button type="button" class="button button-quiet inline-action">Records</button>'
  expect(description('missing', vi.fn())).toBe(`Add your Dusk address under ${records} first, then turn this on.`)
  expect(description('other', vi.fn())).toBe(`alpha.dusk points to another Dusk address. Change it to yours under ${records} first, then turn this on.`)
  // Without a Records section to open, such as for a visitor clearing an old primary name, it is a word.
  expect(description('missing')).toBe('Add your Dusk address under Records first, then turn this on.')
  expect(description(null, vi.fn())).toBe('Turn on to use alpha.dusk as the primary name for your Dusk address.')
})
