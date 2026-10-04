import assert from 'node:assert/strict'

export async function checkPremiumConfirmation(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { useRegistrationFeature } = await import('/src/features/registration/useRegistrationFeature.ts')
    const { RegistrationFlowPanel } = await import('/src/features/registration/RegistrationFlowPanel.tsx')
    const { analyzeName, DEFAULT_FEE_CONFIG, registrationPremiumSchedule } = await import('/src/names/internal.ts')
    window.premiumApprovals = 0
    window.premiumWaits = 0
    const feeConfig = { ...DEFAULT_FEE_CONFIG, premiumStartLux: 2_000_000_000 }
    function Probe({ height }) {
      const premium = registrationPremiumSchedule({ premiumStartLux: feeConfig.premiumStartLux,
        graceEndsAtBlockHeight: 10_000, currentBlockHeight: height, nowSeconds: Date.now() / 1000 })
      const result = { ...analyzeName('aurora'), graceEndsAtBlockHeight: 10_000,
        premiumLux: premium.premiumLux, premiumNextStepBlockHeight: premium.nextStepBlockHeight,
        premiumNextStepAt: premium.nextStepAt, premiumEndsAt: premium.premiumEndsAt }
      const feature = useRegistrationFeature({
        activityFeed: {}, appRuntime: { runtimeConfig: { chainId: 'dusk:0' } }, domainRecordState: {}, domainState: {}, mainViewRuntime: {}, searchRuntime: {},
        namePreview: { result, lifecycleBaseBlockHeight: height, displayName: 'aurora.dusk', canRegister: true,
          registrationFee: 10 + premium.premiumLux / 1e9, expiryDate: '3 Oct 2027' },
        economicsRuntime: { feeConfig, feeConfigError: '' },
        derivedState: { canRevealRegistration: true, txBusy: false, commitBusy: false,
          commitWindow: { status: 'ready', staleInBlocks: 100, waitBlocks: 0 } },
        registrationState: { duration: 1, committed: true, preparedCommit: { controller: 'owner', ownerAddress: 'wallet', chainId: 'dusk:0' }, registrationStep: 'purchase',
          registrationCompletion: null, txState: null, setRegistrationCompletion: () => {}, searchActions: { resume: () => {} } },
        registrationRuntime: { registrationTargetAddress: 'wallet', registrationTargetReady: true, registrationTargetAddressErrors: [] },
        searchState: { setResultView: () => { window.premiumWaits++ } },
        walletRuntime: { selectedAddress: 'wallet', selectedAuthority: 'owner', walletSetupState: 'connected',
          submitNameWrite: { captureSession: () => () => true, captureWorkspace: () => () => true }, setWalletError: () => {},
          ensureContractAuthorityForLiveWrite: () => { window.premiumApprovals++; return false } },
      })
      return React.createElement(RegistrationFlowPanel, feature.registrationProps)
    }
    window.renderPremium = height => root.render(React.createElement(Probe, { height }))
    window.renderPremium(18_610)
  })
  const card = page.locator('.claim-card')
  await card.getByText('The price drops to 10.999999047 DUSK at', { exact: false }).waitFor()
  await card.getByRole('button', { name: 'Wait', exact: true }).click()
  assert.equal(await page.evaluate(() => window.premiumWaits), 1)
  assert.equal(await page.evaluate(() => window.premiumApprovals), 0)
  await page.evaluate(() => { window.savedConfirm = window.confirm; window.confirm = () => { throw new Error('Native dialogs are blocked') } })
  try {
    await card.getByRole('button', { name: 'Register at 11.999999047 DUSK', exact: true }).click()
    await page.waitForFunction(() => window.premiumApprovals === 1)
    await page.evaluate(() => window.renderPremium(18_640))
    await card.getByRole('button', { name: 'Register', exact: true }).waitFor()
    assert.equal(await card.getByRole('button', { name: 'Wait', exact: true }).count(), 0)
    await card.getByRole('button', { name: 'Register', exact: true }).click()
    await page.waitForFunction(() => window.premiumApprovals === 2)
  } finally { await page.evaluate(() => { window.confirm = window.savedConfirm }) }
  console.log('PASS: inline premium confirmation, wait, blocked native dialogs and boundary refresh')
}
