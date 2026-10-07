import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { NamespaceSummary } from './NamespaceSummary'
import { purchaseTakeBackCall, sellerHeldSubnames } from './namespaceTakeBack'
import type { IndexedNameSummary } from '../../names/internal'

const purchased = { node:'root', owner:'buyer', namespacePurchase:{seller:'seller',buyer:'buyer'}, namespace:{
  subnames:[{node:'child',owner:'seller'},{node:'leaf',owner:'seller'},{node:'third-party',owner:'other'}],
} } as IndexedNameSummary
it('takes back all seller-held descendants in one call and excludes other holders', () => {
  expect(purchaseTakeBackCall(purchased, 'buyer')).toMatchObject({ functionName:'take_back_subnames', args:{node:'root',nodes:['child','leaf'],owner:'buyer',manager:'buyer'} })
  expect(sellerHeldSubnames(purchased, 'stranger')).toEqual([])
  expect(sellerHeldSubnames({...purchased,owner:'next'}, 'buyer')).toEqual([])
})
it('renders the namespace count and ownership disclosure', () => {
  expect(renderToStaticMarkup(<NamespaceSummary namespace={{descendantCount:3,heldByOthersCount:1}} />)).toContain('Includes 3 subnames · 1 held by others')
  expect(renderToStaticMarkup(<NamespaceSummary namespace={{descendantCount:0,heldByOthersCount:0}} />)).toBe('')
})
