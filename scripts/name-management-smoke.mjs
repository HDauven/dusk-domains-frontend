import assert from 'node:assert/strict'

export async function checkNameManagement(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { RegistrationPurchaseStep } = await import('/src/features/registration/RegistrationPurchaseStep.tsx')
    root.render(React.createElement(RegistrationPurchaseStep, {
      purchase: {
        canRevealRegistration: false,
        registrationCompletion: null,
        txState: null,
        txBusy: false,
      },
      reservation: {
        canRestartReservation: false,
        commitWindow: { status: 'waiting', waitBlocks: 5, staleInBlocks: 100 },
      },
      wallet: {
        walletSetupState: 'connected',
      },
      quote: {},
    }))
  })
  await page.getByText('Ready in about 50 s', { exact: true }).waitFor()
  await page.clock.runFor(1000)
  await page.getByText('Ready in about 49 s', { exact: true }).waitFor({ timeout: 3000 })
  await page.clock.runFor(50_000)
  await page.getByText('Waiting for the next block…', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Register', exact: true }).isEnabled(), false)
  await page.evaluate(async () => {
    const { React, root } = window
    const { SearchResultPanel } = await import('/src/features/search/SearchResultPanel.tsx')
    root.render(React.createElement(SearchResultPanel, {
      headerProps: { status: 'registered', displayName: 'alpha.dusk', records: [], viewerAuthority: 'owner' },
      detailsProps: {
        displayName: 'alpha.dusk',
        parentResolverRecords: [],
        subnames: [],
        primaryVerification: { tone: 'muted' },
        activity: {
          activityEntries: [],
        },
      },
      overviewProps: {
        canRegister: false,
        quote: {},
        reservation: {},
      },
      nodeHex: 'node',
      resultView: 'details',
      onResultViewChange: value => { window.selectedNameSection = value },
      management: {
        settingsProps: {
          managedName: { node: 'node', owner: 'owner', manager: 'owner' },
          ownership: {},
          renewal: {},
          clock: {},
        },
        primaryProps: { primaryVerification: { verified: false }, displayName: 'alpha.dusk' },
        subdomainsProps: {
          subnames: [],
          creation: {},
          authority: {},
          clock: {},
        },
      },
    }))
  })
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 900 })
    const picker = page.locator('.name-section-select')
    await picker.waitFor()
    assert.equal(await picker.locator('label:visible').count(), 1, 'One visible Section label')
    assert.equal(await page.getByRole('tablist', { name: 'Name sections' }).isVisible(), false)
    assert.ok(await picker.evaluate(element => {
      const background = getComputedStyle(element).backgroundColor
      return background !== 'transparent' && background !== 'rgba(0, 0, 0, 0)'
    }), 'The picker surface keeps sky decorations out from behind its label')
    const label = await picker.locator('label').boundingBox()
    const select = await picker.locator('select').boundingBox()
    assert.ok(label.y + label.height < select.y, 'Section label sits above its picker')
  }
  await page.getByLabel('Section', { exact: true }).selectOption('manage', { timeout: 3000 })
  assert.equal(await page.evaluate(() => window.selectedNameSection), 'manage')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.evaluate(async () => {
    const { React, root } = window
    const { RecordsView } = await import('/src/features/domains/RecordsView.tsx')
    const { useDomainRecordState } = await import('/src/features/domains/useDomainRecordState.ts')
    const { applyRecordMutations } = await import('/src/names/internal.ts')
    function RecordsProbe() {
      const state = useDomainRecordState({ displayName: 'alpha.dusk', nodeHex: 'node', editableRecordKeys: ['website', 'text.description'] })
      return React.createElement(RecordsView, {
        resolverRecords: state.resolverRecords,
        displayName: 'alpha.dusk',
        editableRecordKeys: ['website', 'text.description'],
        actions: {
          canRemoveRecords: true,
          canSaveRecords: state.recordDraftMutations.length > 0 && state.recordDraftErrors.length === 0,
          recordBusy: false,
          error: '',
          txState: null,
          onSaveRecords: async () => {
            window.savedMutations = state.recordDraftMutations
            state.setResolverRecordSets(current => ({ node: applyRecordMutations(current.node ?? [], state.recordDraftMutations) }))
            state.setRecordDrafts({})
            return true
          },
          onClearRecord: record => state.setResolverRecordSets(current => ({ node: current.node.filter(existing => existing.key !== record.key) })),
        },
        wallet: {
          walletAddressAvailable: false,
        },
        draft: {
          criticalRecordChange: state.criticalRecordChange,
          recordDraftErrors: state.recordDraftErrors,
          recordDraftValues: state.recordDraftValues,
          onDraftValueChange: (key, value) => state.setRecordDrafts(current => ({ ...current, [key]: value })),
          onDiscardDrafts: () => state.setRecordDrafts({}),
        },
      })
    }
    root.render(React.createElement(RecordsProbe))
  })
  await page.getByRole('button', { name: 'Add record', exact: true }).click()
  await page.locator('#record-type').selectOption('website')
  await page.getByRole('textbox', { name: 'Website record' }).fill('not-a-url')
  assert.equal(await page.getByRole('button', { name: 'Save record' }).isEnabled(), false)
  await page.getByRole('textbox', { name: 'Website record' }).fill('https://example.test')
  await page.getByRole('button', { name: 'Save record' }).click()
  await page.getByRole('button', { name: 'Edit Website' }).waitFor()
  assert.deepEqual(await page.evaluate(() => window.savedMutations.map(({ key, value }) => ({ key, value }))), [{ key: 'website', value: 'https://example.test' }])
  await page.getByRole('button', { name: 'Edit Website' }).click()
  await page.getByRole('textbox', { name: 'Website record' }).fill('https://edited.test')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Add record', exact: true }).click()
  await page.locator('#record-type').selectOption('text.description')
  await page.getByRole('textbox', { name: 'Description record' }).fill('Description')
  await page.getByRole('button', { name: 'Save record' }).click()
  await page.getByRole('button', { name: 'Edit Description' }).waitFor()
  assert.deepEqual(await page.evaluate(() => window.savedMutations.map(({ key, value }) => ({ key, value }))), [{ key: 'text.description', value: 'Description' }])
  await page.getByRole('button', { name: 'Remove Website' }).click()
  await page.getByRole('button', { name: 'Edit Website' }).waitFor({ state: 'detached' })
  await page.evaluate(async () => {
    const { React, root } = window
    const { RecipientSettingsPanel } = await import('/src/features/domains/settings/RecipientSettingsPanel.tsx')
    const { resolveRecipient } = await import('/src/features/identity/resolveRecipient.ts')
    const address = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'
    window.recipientAddress = address
    function TransferProbe() {
      const [confirmationInput, onConfirmationInputChange] = React.useState('')
      return React.createElement(RecipientSettingsPanel, {
        displayName: 'alpha.dusk',
        managedName: { owner: 'owner', manager: 'owner' },
        ownership: {
          confirmationInput,
          onConfirmationInputChange,
          viewerAuthority: 'owner',
          managementError: '',
          managementTxState: null,
          canManageName: confirmationInput === 'alpha.dusk',
          onResolveRecipient: input => resolveRecipient(input, { getHealth: async () => ({ ok: true }), resolveForward: async () => ({ canonicalName: 'alice.dusk', verificationStatus: 'forward_resolved', errors: [], expiry: { status: 'active', expiresAt: '2099-01-01T00:00:00Z' }, resolver: { health: 'ok' }, cache: { staleAt: '2099-01-01T00:00:00Z' }, records: [{ key: 'moonlight_address', value: address }] }) }),
          onOwnershipUpdate: async change => { window.transferChange = change; return true },
        },
        renewal: {},
        clock: {},
      })
    }
    root.render(React.createElement(TransferProbe))
  })
  await page.getByRole('button', { name: 'Transfer name', exact: true }).click()
  assert.equal(await page.getByRole('checkbox', {name: /Clear records and primary name/}).isChecked(), true)
  await page.getByText("Clear these so payments don't keep going to your address.", {exact:true}).waitFor()
  await page.getByLabel('New owner', { exact: true }).fill('alice.dusk')
  await page.getByRole('button', { name: 'Check recipient' }).click()
  await page.getByRole('button', { name: 'Confirm transfer' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Confirm transfer' }).isEnabled(), false)
  await page.locator('.recipient-form code').filter({ hasText: await page.evaluate(() => window.recipientAddress) }).waitFor()
  await page.getByLabel('Type alpha.dusk to confirm', { exact: true }).fill('alpha.dusk')
  await page.getByRole('button', { name: 'Confirm transfer' }).click()
  await page.waitForFunction(() => window.transferChange)
  assert.deepEqual(await page.evaluate(() => ({ kind: window.transferChange.kind, address: window.transferChange.recipient.address, clearRecords: window.transferChange.clearRecords })), { kind: 'transfer', address: await page.evaluate(() => window.recipientAddress), clearRecords: true })
  await page.getByRole('button', {name:'Transfer name',exact:true}).click()
  await page.getByRole('checkbox', {name:/Clear records and primary name/}).uncheck()
  await page.getByLabel('New owner', {exact:true}).fill('alice.dusk')
  await page.getByRole('button', {name:'Check recipient'}).click()
  await page.getByLabel('Type alpha.dusk to confirm', {exact:true}).fill('alpha.dusk')
  await page.getByRole('button', {name:'Confirm transfer'}).click()
  await page.waitForFunction(() => window.transferChange.clearRecords === false)
  await page.getByRole('button', {name:'Change manager',exact:true}).click()
  assert.equal(await page.getByRole('checkbox', {name:/Clear records and primary name/}).count(), 0)
  await page.getByLabel('New manager', {exact:true}).fill('alice.dusk')
  await page.getByRole('button', {name:'Check recipient'}).click()
  await page.getByRole('button', {name:'Save manager'}).click()
  await page.waitForFunction(() => window.transferChange.kind === 'manager')
  assert.equal(await page.evaluate(() => window.transferChange.clearRecords), false)
}
