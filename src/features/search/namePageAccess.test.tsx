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

it('shows visiting payers only renewal controls for confirmed contract-owned roots', () => {
  const contractProps = {
    ...props, resultView: 'manage',
    headerProps: { ...props.headerProps, viewerAuthority: 'payer' },
    settingsProps: { ...props.settingsProps, displayName: 'alpha.dusk', canRenewName: true, currentBlockHeight: 250, nowSeconds: 1_790_000_000,
      managedName: { ...props.settingsProps.managedName, ownerIsContract: true, inMarketplaceEscrow: false, expiresAt: 200, graceEndsAt: 300 },
      renewalYears: 1, minDurationYears: 1, maxDurationYears: 10, renewalFee: 10, renewalPreviewExpiresAt: 3_153_800 },
  } as SearchResultPanelProps
  const html = renderToStaticMarkup(<SearchResultPanel {...contractProps} />)
  expect(html).toContain('Renewal adds time and does not change the owner.')
  expect(html).toContain('aria-label="Renewal controls"')
  expect(html).not.toContain('Transfer name')
  expect(html).not.toContain('>Records</')
  for (const headerProps of [
    { ...contractProps.headerProps, viewerAuthority: '' },
    { ...contractProps.headerProps, displayName: 'docs.alpha.dusk' },
  ]) expect(renderToStaticMarkup(<SearchResultPanel {...contractProps} headerProps={headerProps} />)).not.toContain('aria-label="Renewal controls"')
  expect(renderToStaticMarkup(<SearchResultPanel {...contractProps} settingsProps={{ ...contractProps.settingsProps,
    managedName: { ...contractProps.settingsProps.managedName, ownerIsContract: false } }} />)).not.toContain('aria-label="Renewal controls"')
})

it('offers no Renew tab or controls for marketplace escrow even when the owner is a deployed contract', () => {
  const html = renderToStaticMarkup(<SearchResultPanel {...props} resultView="manage"
    headerProps={{ ...props.headerProps, viewerAuthority: 'seller' }}
    settingsProps={{ ...props.settingsProps, displayName: 'alpha.dusk', currentBlockHeight: 100, nowSeconds: 1_790_000_000,
      renewalYears: 1, minDurationYears: 1, maxDurationYears: 10, renewalFee: 10, renewalPreviewExpiresAt: 3_153_800,
      managedName: { ...props.settingsProps.managedName, ownerIsContract: true, inMarketplaceEscrow: true, expiresAt: 200, graceEndsAt: 300 } }} />)
  expect(html).not.toContain('>Renew</')
  expect(html).not.toContain('aria-label="Renewal controls"')
  expect(html).toContain('Send to alpha.dusk')
})
