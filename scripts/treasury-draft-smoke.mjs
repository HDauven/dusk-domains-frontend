import assert from 'node:assert/strict'

export async function checkPricingDraft(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { useFeeConfig } = await import('/src/features/treasury/useFeeConfig.ts')
    const { useTreasuryControls } = await import('/src/features/treasury/useTreasuryControls.ts')
    const { DEFAULT_FEE_CONFIG } = await import('/src/names/internal.ts')
    window.livePrice = 91
    window.pricingFails = false
    const client = {getFeeConfig: async () => {
      if (window.pricingFails) throw new Error('Offline')
      return {...DEFAULT_FEE_CONFIG,version:window.livePrice,threeCharYearLux:window.livePrice * 1_000_000_000}
    }}
    const noop = () => {}
    function Pricing() {
      const pricing = useFeeConfig(client)
      const controls = useTreasuryControls({feeConfig:pricing.feeConfig,setFeeConfigConfirmation:noop,setFeeConfigUpdateError:noop,setTreasuryConfirmation:noop,setTreasuryError:noop})
      window.refreshPricing = pricing.loadFeeConfig
      return React.createElement('div', null,
        React.createElement('output',{id:'live-price'},String(pricing.feeConfig.threeCharYearLux / 1_000_000_000)),
        React.createElement('p',{id:'pricing-error'},pricing.feeConfigError),
        React.createElement('input',{'aria-label':'Draft price',value:controls.feeConfigForm.threeCharYearDusk,
          onChange:event=>controls.handleFeeConfigFieldChange('threeCharYearDusk',event.target.value)}))
    }
    root.render(React.createElement(Pricing))
  })
  await page.waitForFunction(() => document.querySelector('input[aria-label="Draft price"]')?.value === '91')
  const draft = page.getByRole('textbox',{name:'Draft price'})
  await draft.fill('123')
  await page.evaluate(async () => { window.pricingFails = true; await window.refreshPricing() })
  await page.locator('#pricing-error').filter({hasText:"Couldn't refresh. Retrying…"}).waitFor()
  assert.equal(await page.locator('#live-price').textContent(), '91', 'Failed refresh retains the last live prices')
  assert.equal(await draft.inputValue(), '123', 'Failed refresh retains the operator draft')
  await page.evaluate(async () => { window.pricingFails = false; window.livePrice = 92; await window.refreshPricing() })
  await page.waitForFunction(() => document.querySelector('#live-price')?.textContent === '92')
  assert.equal(await draft.inputValue(), '123', 'Changed background prices also preserve unsaved edits')
  // Confirmation of the submitted draft makes it clean; later prices can sync again.
  await page.evaluate(async () => { window.livePrice = 123; await window.refreshPricing() })
  await page.waitForFunction(() => document.querySelector('#live-price')?.textContent === '123')
  await page.evaluate(async () => { window.livePrice = 124; await window.refreshPricing() })
  await page.waitForFunction(() => document.querySelector('input[aria-label="Draft price"]')?.value === '124')
  assert.equal(await page.locator('#pricing-error').textContent(), '')
}
