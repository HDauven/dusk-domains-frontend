#!/usr/bin/env node

import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const baseUrl = process.env.DUSK_DOMAINS_E2E_BASE_URL || 'http://127.0.0.1:4175/'
const outputDir = process.env.DUSK_DOMAINS_E2E_OUTPUT_DIR || 'target/ui-pass'
const marketplaceName = process.env.DUSK_DOMAINS_E2E_MARKETPLACE_NAME || 'marketproof.dusk'
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const failures = []
try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'tablet', width: 1024, height: 768 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'small-mobile', width: 360, height: 800 },
  ]) {
    const page = await browser.newPage({ viewport })
    page.on('console', (message) => {
      if (message.type() === 'error') failures.push(`${viewport.name} console: ${message.text()}`)
    })
    page.on('pageerror', (error) => failures.push(`${viewport.name} page: ${error.message}`))
    page.on('requestfailed', (request) => failures.push(`${viewport.name} request: ${request.url()} (${request.failure()?.errorText ?? 'failed'})`))

    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Connect Wallet', exact: true }).waitFor({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Marketplace' }).click()
    await page.getByRole('heading', { name: 'Marketplace' }).waitFor()
    await page.getByText(marketplaceName).waitFor()
    await page.screenshot({ fullPage: true, path: `${outputDir}/marketplace-${viewport.name}.png` })

    const marketplacePanel = page.locator('#marketplace')
    const panelBox = await marketplacePanel.boundingBox()
    if (!panelBox || panelBox.x < 0 || panelBox.x + panelBox.width > viewport.width + 1) {
      failures.push(`${viewport.name}: marketplace panel is outside the viewport`)
    }

    await page.getByRole('button', { name: 'View auction' }).click()
    await page.getByRole('heading', { name: marketplaceName }).waitFor()
    await page.getByRole('heading', { name: 'Auction details' }).waitFor()
    await page.getByRole('heading', { name: 'Auction activity' }).waitFor()
    await page.getByText('Domain secured in escrow').waitFor()
    await page.screenshot({ fullPage: true, path: `${outputDir}/auction-${viewport.name}.png` })

    const detailPanel = page.locator('.marketplace-auction-detail')
    const detailBox = await detailPanel.boundingBox()
    if (!detailBox || detailBox.x < 0 || detailBox.x + detailBox.width > viewport.width + 1) {
      failures.push(`${viewport.name}: auction detail is outside the viewport`)
    }

    await page.getByRole('button', { name: 'Back to marketplace' }).click()
    await page.getByText(marketplaceName).waitFor()

    await page.getByRole('tab', { name: 'Sell' }).click()
    await page.getByText('Connect your wallet').waitFor()
    await page.getByRole('tab', { name: 'Offers' }).click()
    await page.getByRole('heading', { name: 'Make an offer' }).waitFor()
    await page.close()
  }
} finally {
  await browser.close()
}

if (failures.length) {
  throw new Error(`Marketplace browser smoke failed:\n${failures.join('\n')}`)
}

console.log(`Marketplace browser smoke passed: ${baseUrl}`)
