import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { useSellInventory } from './useSellInventory'
import type { IndexedNameSummary } from '../../names/internal'

it('keeps the requested sale name through loading and never substitutes a different name', () => {
  const names = ['first','requested'].map(node => ({node,canonicalName:`${node}.dusk`,owner:'owner',status:'active',subnameCount:0})) as IndexedNameSummary[]
  let selected = ''
  function Probe({loaded,requestedName}:{loaded:boolean;requestedName:string}) {
    const inventory = useSellInventory({accountScope:'owner',ownedNames:loaded ? names : [],auctions:[],fixedSales:[],selectedAuthority:'owner',requestedName})
    selected = inventory.selectedNode
    return null
  }
  renderToStaticMarkup(<Probe loaded={false} requestedName="requested.dusk" />)
  expect(selected).toBe('')
  renderToStaticMarkup(<Probe loaded requestedName="requested.dusk" />)
  expect(selected).toBe('requested')
  renderToStaticMarkup(<Probe loaded requestedName="not-owned.dusk" />)
  expect(selected).toBe('')
})

it('includes roots with subnames while excluding subnames themselves', () => {
  const names = ['alice.dusk', 'docs.alice.dusk'].map((canonicalName, i) => ({node: String(i), canonicalName, owner:'owner',status:'active',subnameCount:2})) as IndexedNameSummary[]
  let eligible: string[] = []
  function Probe() {
    const inventory = useSellInventory({accountScope:'owner', ownedNames:names, auctions:[], fixedSales:[], selectedAuthority:'owner', requestedName:''})
    eligible = inventory.sellableNames.map(name => name.canonicalName)
    return null
  }
  renderToStaticMarkup(<Probe />)
  expect(eligible).toEqual(['alice.dusk'])
})
