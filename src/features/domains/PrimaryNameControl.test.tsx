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
    expect(html).toContain(`<p id="${descriptionId}">Apps show alpha.dusk for this Dusk address.</p>`)
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
