import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function checkPrimaryNameSwitches(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(async () => {
    const { React, root } = window
    const { PrimaryNameControl } = await import('/src/features/domains/PrimaryNameControl.tsx')
    function Profile() {
      const [enabled, setEnabled] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      window.setPrimaryBusy = setBusy
      window.primaryActions = window.primaryActions ?? []
      return React.createElement(PrimaryNameControl, {
        canSetPrimary: !busy, canClearPrimary: !busy, displayName: 'alpha.dusk', error: '', txState: null,
        primaryVerification: { verified: enabled },
        onSetPrimary: () => { window.primaryActions.push('on'); setEnabled(true) },
        onClearPrimary: () => { window.primaryActions.push('off'); setEnabled(false) },
      })
    }
    root.render(React.createElement(Profile))
  })
  const control = page.getByRole('switch', { name: 'Primary name', exact: true })
  await expect(control).toHaveAccessibleName('Primary name')
  await expect(control).toHaveAccessibleDescription('Apps show alpha.dusk for this Dusk address.')
  await expect(page.locator('.primary-control label')).toHaveText('Primary name')
  await expect(control).toHaveAttribute('aria-checked', 'false')
  await control.focus()
  await page.keyboard.press('Space')
  await expect(control).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Enter')
  await expect(control).toHaveAttribute('aria-checked', 'false')
  assert.deepEqual(await page.evaluate(() => window.primaryActions), ['on', 'off'])
  const track = control.locator('.switch-track')
  const thumb = control.locator('.switch-thumb')
  const offPosition = (await thumb.boundingBox()).x
  await page.locator('.primary-control label').click()
  await expect(control).toHaveAttribute('aria-checked', 'true')
  assert.ok((await thumb.boundingBox()).x > offPosition, 'The thumb must move to show the on state')
  assert.ok((await track.boundingBox()).width > (await thumb.boundingBox()).width)
  await page.evaluate(() => window.setPrimaryBusy(true))
  await expect(control).toBeDisabled()
  await page.keyboard.press('Space')
  assert.deepEqual(await page.evaluate(() => window.primaryActions), ['on', 'off', 'on'])
  await page.evaluate(() => window.setPrimaryBusy(false))
  await expect(control).toBeEnabled()
  await control.focus()
  assert.notEqual(await control.evaluate(element => getComputedStyle(element).outlineStyle), 'none')

  await page.evaluate(async () => {
    const { React, root } = window
    const { SearchResultPanel } = await import('/src/features/search/SearchResultPanel.tsx')
    const { deriveAppDerivedState } = await import('/src/app/derived/deriveAppDerivedState.ts')
    const { clearPrimaryDomainName } = await import('/src/features/domains/clearPrimaryDomainName.ts')
    const address = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'
    window.primaryClearCalls = []
    function FormerHolder({ mode }) {
      const [primaryName, setPrimaryName] = React.useState('alice.dusk')
      const [connectedPrimaryName, setConnectedPrimaryName] = React.useState('alice.dusk')
      const moonlightRecord = mode === 'transfer' ? { key: 'moonlight_address', value: address } : undefined
      const managedName = { node: 'name', owner: mode === 'missing' ? '' : 'bob', manager: 'bob', expiresAt: 200, graceEndsAt: 300 }
      const state = deriveAppDerivedState({ walletSigningReady: true, selectedAddress: address, selectedAuthority: 'alice',
        nodeHex: 'name', displayName: 'alice.dusk', managedName, primaryName, connectedPrimaryName, primaryEndpointValue: address,
        moonlightRecord,
        currentBlockHeight: mode === 'expired' ? 400 : 100, nowSeconds: 0, pendingReservations: [], subnames: [], subnameLabel: '', subnameManager: '',
        confirmationInput: '', recordDraftMutations: [], recordDraftErrors: [] })
      const submitNameWrite = Object.assign(async (_name, call) => {
        window.primaryClearCalls.push(call)
        return { status: 'executed', txId: 'clear' }
      }, { captureWorkspace: () => () => true })
      return React.createElement(SearchResultPanel, {
        nodeHex: 'name',
        resultView: mode === 'expired' ? 'overview' : 'details',
        headerProps: { status: ['missing', 'expired'].includes(mode) ? 'available' : 'registered', displayName: 'alice.dusk', records: [], viewerAuthority: 'alice' },
        detailsProps: {
          displayName: 'alice.dusk',
          parentResolverRecords: [],
          subnames: [],
          primaryVerification: { tone: 'muted' },
          activity: {
            activityEntries: [],
          },
        },
        overviewProps: {
          canRegister: mode === 'expired',
          displayName: 'alice.dusk',
          quote: {
            duration: 1,
            registrationFee: 1,
          },
          reservation: {},
        },
        management: {
          settingsProps: {
            managedName,
            ownership: {},
            renewal: {},
            clock: {},
          },
          subdomainsProps: {
            subnames: [],
            creation: {},
            authority: {},
            clock: {},
          },
          primaryProps: { ...state, displayName: 'alice.dusk', error: '', txState: null,
            onSetPrimary: () => { throw new Error('Former holder cannot set a primary') },
            onClearPrimary: () => clearPrimaryDomainName({ ...state, displayName: 'alice.dusk', selectedAuthority: 'alice',
              runtimeConfig: { contracts: {} }, walletSetupState: 'connected', submitNameWrite, setPrimaryName, setConnectedPrimaryName, moonlightRecord,
              setPrimaryError: () => {}, setPrimaryTxState: () => {}, appendActivity: () => {},
              ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
              shouldApplyPreviewWriteFallback: async () => true }) },
        },
      })
    }
    window.renderPrimaryClearCase = mode => root.render(React.createElement(FormerHolder, { key: mode, mode }))
  })
  for (const mode of ['transfer', 'take-back', 'missing', 'expired']) {
    await page.evaluate(mode => window.renderPrimaryClearCase(mode), mode)
    if (mode === 'expired') await expect(page.getByRole('button', { name: 'Claim alice.dusk', exact: true })).toBeVisible()
    const clear = mode === 'transfer' ? control : page.getByRole('button', { name: 'Clear primary name', exact: true })
    await expect(clear).toBeEnabled()
    assert.equal(await page.getByRole('tab', { name: 'Records', exact: true }).count(), 0)
    await clear.click()
    await expect(page.locator('.primary-control')).toHaveCount(0)
  }
  const clearCalls = await page.evaluate(() => window.primaryClearCalls)
  assert.equal(clearCalls.length, 4)
  for (const call of clearCalls) {
    assert.equal(call.functionName, 'clear_primary_name')
    assert.deepEqual(Object.keys(call.args).sort(), ['endpointType', 'endpointValue'])
  }

  await page.evaluate(async () => {
    const { React, root } = window
    const { useIndexedNameHydration } = await import('/src/features/search/useIndexedNameHydration.ts')
    const noop = () => {}
    const client = {
      getHealth: async () => ({ ok: true, currentBlockHeight: 100 }),
      resolveForward: async () => ({ records: [] }), getNameState: async () => null,
      getActivityPage: async () => ({ activity: [] }), getAllSubnames: async () => [],
      getPrimaryName: ({ value }) => value === 'alice-address'
        ? new Promise(resolve => { window.releaseAlicePrimary = () => resolve('alice.dusk') })
        : Promise.resolve('bob.dusk'),
    }
    function Hydration({ address }) {
      const [primary, setConnectedPrimaryName] = React.useState(null)
      const hydration = useIndexedNameHydration({ displayName: 'alice.dusk', selectedAddress: address, indexerClient: client,
        activity: { beginRead: () => () => true, hydrate: noop },
        domain: { beginRead: () => () => true, hydrate: snapshot => setConnectedPrimaryName(snapshot.connectedPrimaryName) },
        records: { hydrate: noop }, search: { updateClock: noop, fail: noop } })
      window.hydratePrimary = () => hydration.hydrateNameFromIndexer(client, { canonical: 'alice.dusk' })
      return React.createElement('output', { id: 'primary-hydration', 'data-address': address }, primary)
    }
    window.renderPrimaryWallet = address => root.render(React.createElement(Hydration, { address }))
    window.renderPrimaryWallet('alice-address')
  })
  await page.locator('#primary-hydration[data-address="alice-address"]').waitFor({ state: 'attached' })
  await page.evaluate(() => { window.aliceHydration = window.hydratePrimary() })
  await page.waitForFunction(() => Boolean(window.releaseAlicePrimary))
  await page.evaluate(() => window.renderPrimaryWallet('bob-address'))
  await page.locator('#primary-hydration[data-address="bob-address"]').waitFor({ state: 'attached' })
  await page.evaluate(() => { window.bobHydration = window.hydratePrimary() })
  await expect(page.locator('#primary-hydration')).toHaveText('bob.dusk')
  await page.evaluate(async () => { window.releaseAlicePrimary(); await window.aliceHydration; await window.bobHydration })
  await expect(page.locator('#primary-hydration')).toHaveText('bob.dusk')

  await page.evaluate(async () => {
    const { React, root } = window
    const { useIndexedNameHydration } = await import('/src/features/search/useIndexedNameHydration.ts')
    const { useDomainManagementAppState } = await import('/src/app/useDomainManagementAppState.ts')
    const { deriveAppDerivedState } = await import('/src/app/derived/deriveAppDerivedState.ts')
    const { DomainDetailsView } = await import('/src/features/domains/DomainDetailsView.tsx')
    const { namehashHex } = await import('/src/names/internal.ts')
    const alice = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'
    const bob = '244Sywxj7PuMHpcPxemaXLcrY5rPgztra6H9Vz8cU1Ro5v23SxKTfVqr2yS7NXAXE1iq59ndn4aMZmYxuzu3Te3e9fokQKTUkYvFxYg2P2E8EEg1gWUbs3AFL2aNx62HQd7r'
    const node = namehashHex('bob.dusk'), noop = () => {}
    const client = {
      getHealth: async () => ({ ok: true, currentBlockHeight: 100 }),
      resolveForward: async () => ({ records: [{ key: 'moonlight_address', value: bob }], verificationStatus: 'forward_resolved', expiry: { status: 'active' }, resolver: { health: 'ok' } }),
      getNameState: async () => ({ owner: 'bob', manager: 'bob', expiresAtBlockHeight: 200, graceEndsAtBlockHeight: 300 }),
      getActivityPage: async () => ({ activity: [] }), getAllSubnames: async () => [],
      getPrimaryName: async ({ value }) => value === bob ? 'bob.dusk' : 'alice.dusk',
    }
    function BobProfile({ connected }) {
      const domain = useDomainManagementAppState('resolver', null, null)
      const [records, setResolverRecordSets] = React.useState({})
      const selectedAddress = connected ? alice : ''
      const hydration = useIndexedNameHydration({ domain: domain.searchActions, displayName: 'bob.dusk', selectedAddress, indexerClient: client,
        onChainClient: null, recordSourceContractId: 'resolver',
        activity: { beginRead: () => () => true, hydrate: noop },
        records: { hydrate: (node, entries) => setResolverRecordSets(current => ({ ...current, [node]: entries ?? [] })) },
        search: { updateClock: noop, fail: noop } })
      window.hydrateBobProfile = () => hydration.hydrateNameFromIndexer(client, { canonical: 'bob.dusk' })
      const state = deriveAppDerivedState({ ...domain, selectedAddress, selectedAuthority: connected ? 'alice' : '',
        displayName: 'bob.dusk', nodeHex: node, moonlightRecord: records[node]?.[0], currentBlockHeight: 100,
        nowSeconds: 0, pendingReservations: [], recordDraftMutations: [], recordDraftErrors: [], walletSigningReady: connected })
      return React.createElement(DomainDetailsView, {
        displayName: 'bob.dusk',
        parentResolverRecords: records[node] ?? [],
        subnames: [],
        primaryVerification: state.primaryVerification,
        activity: {
          activityEntries: [],
        },
      })
    }
    window.renderBobProfile = connected => root.render(React.createElement(BobProfile, { key: String(connected), connected }))
  })
  for (const connected of [false, true]) {
    await page.evaluate(connected => window.renderBobProfile(connected), connected)
    await expect(page.locator('.primary-line')).toHaveText('This name is not the primary name for its Dusk address.')
    await page.evaluate(() => window.hydrateBobProfile())
    await expect(page.locator('.primary-line')).toHaveText('Apps show bob.dusk for this Dusk address.')
  }

  await page.evaluate(async () => {
    const { React, root } = window
    const { RegistrationSummary } = await import('/src/features/registration/RegistrationSummary.tsx')
    function Claim() {
      const [primary, setPrimary] = React.useState(false)
      return React.createElement(RegistrationSummary, {
        committed: true,
        registrationComplete: false,
        selectedAddress: 'address',
        referral: {
          activeReferral: null,
          appliedReferral: null,
        },
        quote: {
          duration: 1,
          expiryDate: '2027-10-01',
          feeConfigError: '',
          onChangeTerm: () => {},
          registrationFee: 10,
          registrationTargetAddress: 'address',
        },
        primaryChoice: {
          onRegisterSetsPrimaryChange: setPrimary,
          registerSetsPrimary: primary,
        },
      })
    }
    root.render(React.createElement(Claim))
  })
  await expect(control).toHaveAttribute('aria-checked', 'false')
  await control.focus()
  await page.keyboard.press('Space')
  await expect(control).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Enter')
  await expect(control).toHaveAttribute('aria-checked', 'false')
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    assert.ok((await control.boundingBox()).height >= 44)
    assert.ok(await page.locator('.register-summary').evaluate(element => element.scrollWidth <= element.clientWidth))
    await expect(control.locator('.switch-track')).toBeVisible()
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
}
