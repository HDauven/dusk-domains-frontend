import assert from 'node:assert/strict'

export async function checkNameManagement(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { RegistrationPurchaseStep } = await import('/src/features/registration/RegistrationPurchaseStep.tsx')
    root.render(React.createElement(RegistrationPurchaseStep, {
      canRevealRegistration: false, canRestartReservation: false,
      commitWindow: { status: 'waiting', waitBlocks: 5, staleInBlocks: 100 },
      walletSetupState: 'connected', registrationCompletion: null, txState: null, txBusy: false,
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
      settingsProps: { managedName: { node: 'node', owner: 'owner', manager: 'owner' } },
      detailsProps: { displayName: 'alpha.dusk', parentResolverRecords: [], activityEntries: [], subnames: [], primaryVerification: { tone: 'muted' } },
      primaryProps: { primaryVerification: { verified: false }, displayName: 'alpha.dusk' },
      subdomainsProps: { subnames: [] }, overviewProps: { canRegister: false }, nodeHex: 'node', resultView: 'details',
      onResultViewChange: value => { window.selectedNameSection = value },
    }))
  })
  await page.setViewportSize({ width: 390, height: 900 })
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
        ...state, displayName: 'alpha.dusk', editableRecordKeys: ['website', 'text.description'], canRemoveRecords: true,
        canSaveRecords: state.recordDraftMutations.length > 0 && state.recordDraftErrors.length === 0,
        recordBusy: false, walletAddressAvailable: false, error: '', txState: null,
        onDraftValueChange: (key, value) => state.setRecordDrafts(current => ({ ...current, [key]: value })),
        onDiscardDrafts: () => state.setRecordDrafts({}),
        onSaveRecords: async () => {
          window.savedMutations = state.recordDraftMutations
          state.setResolverRecordSets(current => ({ node: applyRecordMutations(current.node ?? [], state.recordDraftMutations) }))
          state.setRecordDrafts({})
          return true
        },
        onClearRecord: record => state.setResolverRecordSets(current => ({ node: current.node.filter(existing => existing.key !== record.key) })),
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
        displayName: 'alpha.dusk', confirmationInput, onConfirmationInputChange,
        managedName: { owner: 'owner', manager: 'owner' }, viewerAuthority: 'owner',
        managementError: '', managementTxState: null, canManageName: confirmationInput === 'alpha.dusk',
        onResolveRecipient: input => resolveRecipient(input, { getHealth: async () => ({ ok: true }), resolveForward: async () => ({ canonicalName: 'alice.dusk', verificationStatus: 'forward_resolved', errors: [], expiry: { status: 'active', expiresAt: '2099-01-01T00:00:00Z' }, resolver: { health: 'ok' }, cache: { staleAt: '2099-01-01T00:00:00Z' }, records: [{ key: 'moonlight_address', value: address }] }) }),
        onOwnershipUpdate: async change => { window.transferChange = change; return true },
      })
    }
    root.render(React.createElement(TransferProbe))
  })
  await page.getByRole('button', { name: 'Transfer name', exact: true }).click()
  await page.getByLabel('New owner', { exact: true }).fill('alice.dusk')
  await page.getByRole('button', { name: 'Check recipient' }).click()
  await page.getByRole('button', { name: 'Confirm transfer' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Confirm transfer' }).isEnabled(), false)
  await page.locator('.recipient-form code').filter({ hasText: await page.evaluate(() => window.recipientAddress) }).waitFor()
  await page.getByLabel('Type alpha.dusk to confirm', { exact: true }).fill('alpha.dusk')
  await page.getByRole('button', { name: 'Confirm transfer' }).click()
  await page.waitForFunction(() => window.transferChange)
  assert.deepEqual(await page.evaluate(() => ({ kind: window.transferChange.kind, address: window.transferChange.recipient.address })), { kind: 'transfer', address: await page.evaluate(() => window.recipientAddress) })
}
