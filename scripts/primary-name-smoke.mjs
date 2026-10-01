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
    const { RegistrationSummary } = await import('/src/features/registration/RegistrationSummary.tsx')
    function Claim() {
      const [primary, setPrimary] = React.useState(false)
      return React.createElement(RegistrationSummary, {
        activeReferral: null, appliedReferral: null, committed: true, duration: 1,
        expiryDate: '2027-10-01', feeConfigError: '', onChangeTerm: () => {},
        onRegisterSetsPrimaryChange: setPrimary, registerSetsPrimary: primary,
        registrationComplete: false, registrationFee: 10, registrationTargetAddress: 'address', selectedAddress: 'address',
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
