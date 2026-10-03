import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { namePageAccess, nameSections } from './namePageAccess'
import { SearchResultPanel, type SearchResultPanelProps } from './SearchResultPanel'
const props = {
  headerProps: { status: 'registered', displayName: 'alpha.dusk', records: [], viewerAuthority: '' },
  detailsProps: {
    displayName:'alpha.dusk',
    parentResolverRecords:[],
    subnames:[],
    primaryVerification:{tone:'muted'},
    activity: { activityEntries:[] },
  },
  overviewProps: {
    canRegister:false,
    quote: {  },
    reservation: {  },
  },
  nodeHex:'node',
  resultView:'records',
  management: { settingsProps: {
      managedName: {node: 'node', owner: 'owner', manager: 'manager'},
      ownership: {  },
      renewal: {  },
      clock: {  },
    }, subdomainsProps: {
      subnames:[],
      creation: {  },
      authority: {  },
      clock: {  },
    } },
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
    ...props,
    resultView: 'manage',
    headerProps: { ...props.headerProps, viewerAuthority: 'payer' },
    management: {
      ...props.management,
      settingsProps: {
        ...props.management.settingsProps,
        displayName: 'alpha.dusk',
        managedName: { ...props.management.settingsProps.managedName, ownerIsContract: true, inMarketplaceEscrow: false, expiresAt: 200, graceEndsAt: 300 },
        renewal: {
          ...props.management.settingsProps.renewal,
          canRenewName: true,
          renewalYears: 1,
          minDurationYears: 1,
          maxDurationYears: 10,
          renewalFee: 10,
          renewalPreviewExpiresAt: 3_153_800,
        },
        clock: {
          ...props.management.settingsProps.clock,
          currentBlockHeight: 250,
          nowSeconds: 1_790_000_000,
        },
        ownership: {  },
      },
    },
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
  expect(renderToStaticMarkup(<SearchResultPanel {...contractProps}
    management={{ ...contractProps.management, settingsProps: { ...contractProps.management.settingsProps,
        managedName: { ...contractProps.management.settingsProps.managedName, ownerIsContract: false } } }} />)).not.toContain('aria-label="Renewal controls"')
})

it('offers no Renew tab or controls for marketplace escrow even when the owner is a deployed contract', () => {
  const html = renderToStaticMarkup(<SearchResultPanel {...props}
    resultView="manage"
    headerProps={{ ...props.headerProps, viewerAuthority: 'seller' }}
    management={{ ...props.management, settingsProps: {
        ...props.management.settingsProps,
        displayName: 'alpha.dusk',
        managedName: { ...props.management.settingsProps.managedName, ownerIsContract: true, inMarketplaceEscrow: true, expiresAt: 200, graceEndsAt: 300 },
        clock: {
          ...props.management.settingsProps.clock,
          currentBlockHeight: 100,
          nowSeconds: 1_790_000_000,
        },
        renewal: {
          ...props.management.settingsProps.renewal,
          renewalYears: 1,
          minDurationYears: 1,
          maxDurationYears: 10,
          renewalFee: 10,
          renewalPreviewExpiresAt: 3_153_800,
        },
      } }} />)
  expect(html).not.toContain('>Renew</')
  expect(html).not.toContain('aria-label="Renewal controls"')
  expect(html).toContain('Send to alpha.dusk')
})

it.each(['details', 'records', 'subnames'] as const)('shows ancestor actions without holder editing on %s', resultView => {
  const parent = {node:'parent',name:'alice.dusk',owner:'parent-owner',manager:'parent-manager',expiresAtBlockHeight:200}
  const subnameProps = {
    ...props,
    resultView,
    headerProps:{...props.headerProps,displayName:'docs.alice.dusk',viewerAuthority:'parent-manager'},
    management: {
      ...props.management,
      primaryProps:{primaryVerification:{verified:false}},
      settingsProps:{
        ...props.management.settingsProps,
        managedName:{...props.management.settingsProps.managedName,ancestors:[parent]},
        clock: {
          ...props.management.settingsProps.clock,
          currentBlockHeight:100,
        },
        ownership: {  },
        renewal: {  },
      },
    },
  } as SearchResultPanelProps
  const html = renderToStaticMarkup(<SearchResultPanel {...subnameProps} />)
  expect(html).toContain('The owner of alice.dusk can take this name back, and it expires with alice.dusk.')
  expect(html).not.toContain('>Records</')
  expect(html).not.toContain('Create subname')
  expect(html).not.toContain('primary-control')
  expect(html).toContain('>Reassign</')
  expect(html).toContain('>Take back</')
  expect(html).toContain('>Remove</')
})


it('shows primary clearing to the endpoint holder without name editing controls', () => {
  const html = renderToStaticMarkup(<SearchResultPanel {...props}
    resultView="details"
    headerProps={{ ...props.headerProps, viewerAuthority: 'former-owner' }}
    management={{ ...props.management, primaryProps: { canClearPrimary: true, canSetPrimary: false, displayName: 'alpha.dusk', error: '', txState: null,
        primaryVerification: { verified: true }, onClearPrimary: () => {}, onSetPrimary: () => {} } }} />)
  expect(html).toContain('primary-control')
  expect(html).toContain('aria-checked="true"')
  expect(html).not.toContain('disabled=""')
  expect(html).not.toContain('>Records</')
  expect(html).not.toContain('>Settings</')
})
