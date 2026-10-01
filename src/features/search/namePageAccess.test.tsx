import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { namePageAccess, nameSections } from './namePageAccess'
import { SearchResultPanel, type SearchResultPanelProps } from './SearchResultPanel'
const props = {
  headerProps: { status: 'registered', displayName: 'alpha.dusk', records: [], viewerAuthority: '' },
  settingsProps: { managedName: {node: 'node', owner: 'owner', manager: 'manager'} },
  detailsProps: {displayName:'alpha.dusk', parentResolverRecords:[], activityEntries:[], subnames:[], primaryVerification:{tone:'muted'}},
  subdomainsProps: {subnames:[]}, overviewProps: {canRegister:false}, nodeHex:'node', resultView:'records',
} as unknown as SearchResultPanelProps

it('gives visitors only public sections and owners and managers editing sections', () => {
  expect(namePageAccess('owner','manager','')).toEqual({isOwner:false, canEdit:false})
  expect(namePageAccess('owner','manager','stranger').canEdit).toBe(false)
  expect(namePageAccess('owner','manager','manager')).toEqual({isOwner:false, canEdit:true})
  expect(namePageAccess('owner','manager','owner')).toEqual({isOwner:true, canEdit:true})
  expect(nameSections(false,false).map(tab=>tab.id)).toEqual(['details','activity'])
  expect(nameSections(false,true).map(tab=>tab.id)).toEqual(['details','subnames','activity'])
  expect(nameSections(true,false).map(tab=>tab.id)).toEqual(['details','records','subnames','manage','activity'])
})
it('falls back to the public profile when disconnecting on an owner tab', () => {
  const html=renderToStaticMarkup(<SearchResultPanel {...props} />)
  expect(html).toContain('Send to alpha.dusk')
  expect(html).not.toContain('Add an address')
  expect(html).not.toContain('Add one under Subnames')
  expect(html).not.toContain('>Records</')
  expect(html).not.toContain('>Settings</')
  expect(html).toContain('<select')
})
