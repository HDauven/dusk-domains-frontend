import { expect, it } from 'vitest'
import { suggestedNames } from './suggestedNames'

it('offers other root names without preserving a taken suffix', () => {
  expect(suggestedNames('alpha.dusk')).toEqual(['alphahq.dusk', 'myalpha.dusk', 'alpha1.dusk'])
})
