import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { canOfferOn, namePageAccess, nameSections } from './namePageAccess'
import { NameHeader } from './NameHeader'
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
  const html = renderToStaticMarkup(<SearchResultPanel {...subnameProps} />).replaceAll('&#x27;', '\'')
  expect(html).toContain('The owner or manager of alice.dusk can take this name back, give it to another wallet or remove it, and its holder can\'t prevent this. It expires no later than alice.dusk.')
  // A subname that inherits its parent's expiry expires with it; one deeper down can be taken back from any name above.
  const inheriting = { ...subnameProps, management: { ...subnameProps.management, settingsProps: { ...subnameProps.management.settingsProps,
    managedName: { ...subnameProps.management.settingsProps.managedName, expiryPolicy: 'inherits_parent',
      ancestors: [parent, { ...parent, node: 'root', name: 'dusk-root.dusk' }] } } } } as SearchResultPanelProps
  expect(renderToStaticMarkup(<SearchResultPanel {...inheriting} />).replaceAll('&#x27;', '\''))
    .toContain('The owner or manager of alice.dusk or a name above it can take this name back, give it to another wallet or remove it, and its holder can\'t prevent this. It expires with alice.dusk.')
  expect(html).not.toContain('>Records</')
  expect(html).not.toContain('Create subname')
  expect(html).not.toContain('primary-control')
  expect(html).toContain('>Reassign</')
  expect(html).toContain('>Take back</')
  expect(html).toContain('>Remove</')
})

it('tells holders and visitors on every subname page that a name above can take it back', () => {
  const sam = { node: 'parent', name: 'nightowlshq.dusk', owner: 'sam', manager: 'sam', expiresAtBlockHeight: 200 }
  // null: the indexer did not report the names above.
  const page = (viewerAuthority: string, holders: { owner: string, manager: string }, ancestors: unknown[] | null = [sam], displayName = 'maya.nightowlshq.dusk') =>
    renderToStaticMarkup(<SearchResultPanel {...props} resultView="details"
      headerProps={{ ...props.headerProps, displayName, viewerAuthority }}
      management={{ ...props.management, settingsProps: { ...props.management.settingsProps, clock: { currentBlockHeight: 100 },
        managedName: { ...props.management.settingsProps.managedName, ...holders, expiryPolicy: 'inherits_parent', ancestors: ancestors ?? undefined } } } as never} />)
      .replaceAll('&#x27;', '\'')
  const rule = 'The owner or manager of nightowlshq.dusk can take this name back, give it to another wallet or remove it'
  // Sam created it for Maya: he owns it and owns its parent, and she manages it. This used to hide the rule.
  expect(page('maya', { owner: 'sam', manager: 'maya' })).toContain(`${rule}. You can't prevent this. It expires with nightowlshq.dusk.`)
  // A holder who owns it outright sees it too.
  expect(page('maya', { owner: 'maya', manager: 'maya' })).toContain(`${rule}. You can't prevent this.`)
  // Visitors see it on the public page, and so does the parent's holder, who can do it.
  for (const viewer of ['', 'stranger', 'sam']) {
    expect(page(viewer, { owner: 'sam', manager: 'maya' })).toContain(`${rule}, and its holder can't prevent this. It expires with nightowlshq.dusk.`)
  }
  // Names further down can be taken back from any name above; the parent's name is known from the name itself.
  expect(page('', { owner: 'sam', manager: 'sam' }, null, 'pay.team.alice.dusk'))
    .toContain('The owner or manager of team.alice.dusk or a name above it can take this name back')
  // An empty list of names above doesn't hide the names further up.
  expect(page('', { owner: 'sam', manager: 'sam' }, [], 'pay.team.alice.dusk'))
    .toContain('The owner or manager of team.alice.dusk or a name above it can take this name back')
  // A root name has no name above it.
  expect(page('', { owner: 'sam', manager: 'sam' }, [], 'nightowlshq.dusk')).not.toContain('can take this name back')
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

it('offers anyone but the owner a way to make an offer on a live second-level name', () => {
  const live = { name: 'alpha.dusk', status: 'registered' as const, owner: '0xowner', expiresAt: 2_000, currentBlockHeight: 1_000, viewer: '' }
  expect(canOfferOn(live)).toBe(true)
  expect(canOfferOn({ ...live, viewer: '0xbuyer' })).toBe(true)
  expect(canOfferOn({ ...live, viewer: '0xowner' })).toBe(false)
  expect(canOfferOn({ ...live, name: 'swap.alpha.dusk' })).toBe(false)
  expect(canOfferOn({ ...live, ownerIsContract: true })).toBe(false)
  expect(canOfferOn({ ...live, currentBlockHeight: 2_000 })).toBe(false)
  expect(canOfferOn({ ...live, status: 'available' })).toBe(false)
  expect(canOfferOn({ ...live, owner: null })).toBe(false)
})

it('links the name header to the Offers tab with the name filled in', () => {
  const header = (canMakeOffer: boolean) => renderToStaticMarkup(<NameHeader canMakeOffer={canMakeOffer} displayName="alpha.dusk" lifecycleLabel={null}
    primaryVerified={false} owner="0xowner" records={[]} reserved={false} status="registered" />)
  expect(header(true)).toMatch(/<a [^>]*href="\/market\/offer\/alpha.dusk"[^>]*>Make an offer<\/a>/)
  expect(header(false)).not.toContain('Make an offer')
})

it.each(['', 'owner', 'manager', 'visitor'])('offers reporting on registered pages for viewer %s', viewerAuthority => {
  for (const displayName of ['alpha.dusk', 'google.dusk', 'mail.google.dusk']) {
    const html = renderToStaticMarkup(<SearchResultPanel {...props} resultView="details"
      abuseUrl="https://github.com/HDauven/dusk-domains-frontend/issues/new?template=abuse-report.yml"
      headerProps={{ ...props.headerProps, displayName, viewerAuthority }}
      management={{ ...props.management, primaryProps: { ...props.management.primaryProps, primaryVerification: { verified: false } } }} />)
    expect(html).toContain('>Report this name</a>')
    expect(html).toContain(`name=${displayName}`)
    expect(html).toContain(`title=%5BAbuse%5D%3A+${displayName}`)
  }
})

it.each(['available', 'reserved', 'invalid'] as const)('does not offer reporting for an unregistered %s name', status => {
  const html = renderToStaticMarkup(<SearchResultPanel {...props} resultView="overview" abuseUrl="https://forms.example.test/report"
    headerProps={{ ...props.headerProps, status }} overviewProps={{ ...props.overviewProps, resultStatus: status, resultIssues: [] }} />)
  expect(html).not.toContain('Report this name')
})

it('does not render a dead report link without a configured destination', () => {
  expect(renderToStaticMarkup(<SearchResultPanel {...props} />)).not.toContain('Report this name')
})

it('shows loading instead of lifecycle, owner or empty records until the open node is hydrated', () => {
  const html = renderToStaticMarkup(<SearchResultPanel {...props} resultView="details"
    headerProps={{ ...props.headerProps, lifecycleLabel: 'Expires tomorrow' }}
    management={{ ...props.management, settingsProps: { ...props.management.settingsProps, managedName: { ...props.management.settingsProps.managedName, node: 'previous-node' } } }} />)
  expect(html).toContain('Loading owner, expiry and records')
  expect(html).not.toContain('Expires tomorrow')
  expect(html).not.toContain('No addresses yet')
})

it('points to staged record changes from the other sections of the name page', () => {
  const draft = { recordDraftMutations: [{ action: 'clear', key: 'website' }], recordDraftValues: {}, recordDraftErrors: [] }
  const staged = (resultView: string, count = 1) => renderToStaticMarkup(<SearchResultPanel {...props} resultView={resultView as never}
    headerProps={{ ...props.headerProps, viewerAuthority: 'owner' }}
    management={{ ...props.management, recordsProps: { draft: { ...draft, recordDraftMutations: Array(count).fill(draft.recordDraftMutations[0]) } } } as never} />)
  expect(staged('details')).toContain('1 record change is not saved yet.')
  expect(staged('details', 2)).toContain('2 record changes are not saved yet.')
  expect(staged('details')).toContain('>Review</button>')
  // A staged value that can't be saved yet is unsaved too.
  expect(renderToStaticMarkup(<SearchResultPanel {...props} resultView="details" headerProps={{ ...props.headerProps, viewerAuthority: 'owner' }}
    management={{ ...props.management, recordsProps: { draft: { ...draft, recordDraftInvalid: [{ key: 'avatar', error: 'Use a valid HTTPS URL.' }] } } } as never} />))
    .toContain('2 record changes are not saved yet.')
  // The records section shows the changes themselves; visitors see nothing.
  expect(renderToStaticMarkup(<SearchResultPanel {...props} resultView="details"
    management={{ ...props.management, recordsProps: { draft } } as never} />)).not.toContain('not saved yet')
})
