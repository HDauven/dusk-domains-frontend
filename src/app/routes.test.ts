import { describe, expect, it } from 'vitest'
import { parseRoute, routePath } from './routes'

describe('routes', () => {
  it('maps paths to views', () => {
    expect(parseRoute('/')).toEqual({ view: 'search' })
    expect(parseRoute('/my')).toEqual({ view: 'my-names' })
    expect(parseRoute('/market/')).toEqual({ view: 'marketplace' })
    expect(parseRoute('/nowhere')).toEqual({ view: 'search' })
  })

  it('opens names with or without the .dusk suffix', () => {
    expect(parseRoute('/name/pie.dusk')).toEqual({ view: 'search', name: 'pie.dusk' })
    expect(parseRoute('/name/Pie')).toEqual({ view: 'search', name: 'pie.dusk' })
  })

  it('round-trips every route', () => {
    for (const route of [{ view: 'search' as const }, { view: 'treasury' as const }, { view: 'search' as const, name: 'swap.pie.dusk' }]) {
      expect(parseRoute(routePath(route))).toEqual(route)
    }
  })
})
