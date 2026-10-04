import { expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useDomainManagementFeature } from './useDomainManagementFeature'
import type { UseDomainManagementFeatureProps } from './domainManagementFeatureTypes'

it('discards drafts between inline edits and preserves wallet errors and renewal bounds', async () => {
  const setters = {
    setRecordDrafts: vi.fn(), setRecordError: vi.fn(), setRecordTxState: vi.fn(),
    setPrimaryEndpointValue: vi.fn(), setPrimaryError: vi.fn(), setRenewalYears: vi.fn(),
  }
  const requestSelectedShieldedAddress = vi.fn().mockResolvedValue('shielded')
  const inputs = {
    appRuntime: {}, activityFeed: {}, derivedState: {}, economicsRuntime: {}, searchRuntime: {}, searchState: {},
    namePreview: { result: {}, renewalPreviewLifecycle: { expiresAt: 123 } },
    domainState: { ...setters, managedName: { expiresAt: 123 } },
    domainRecordState: { ...setters, recordDraftMutations: [{}, {}], moonlightRecord: { value: 'forward-record' } },
    walletRuntime: { submitNameWrite: { captureWorkspace: () => () => true, captureSession: () => () => true }, requestSelectedShieldedAddress, selectedAddress: 'public', walletSession: {} },
  } as unknown as UseDomainManagementFeatureProps
  let views!: ReturnType<typeof useDomainManagementFeature>
  function Probe() {
    views = useDomainManagementFeature(inputs)
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  expect(views.subdomainsProps.managedNameExpiresAt).toBe(123)
  views.settingsProps.renewal.onRenewalYearsChange(100)
  expect(setters.setRenewalYears).toHaveBeenCalledWith(10)

  views.recordsProps.draft.onDraftValueChange('website', 'https://example.com')
  expect(setters.setRecordDrafts.mock.lastCall![0]({ avatar: 'existing' }))
    .toEqual({ avatar: 'existing', website: 'https://example.com' })
  views.recordsProps.wallet.onUseWalletPublicAddress()
  expect(setters.setRecordDrafts.mock.lastCall![0]({ avatar: 'existing' }))
    .toEqual({ avatar: 'existing', moonlight_address: 'public' })
  await views.recordsProps.wallet.onUseWalletShieldedAddress()
  expect(setters.setRecordDrafts.mock.lastCall![0]({ avatar: 'existing' }))
    .toEqual({ avatar: 'existing', phoenix_payment_endpoint: 'shielded' })
  requestSelectedShieldedAddress.mockRejectedValueOnce(new Error('Wallet locked'))
  await views.recordsProps.wallet.onUseWalletShieldedAddress()
  expect(setters.setRecordError).toHaveBeenLastCalledWith('Wallet locked')

  views.recordsProps.draft.onDiscardDrafts()
  expect(setters.setRecordDrafts).toHaveBeenCalledWith({})
  expect(setters.setRecordError).toHaveBeenCalledWith('')
  expect(setters.setRecordTxState).toHaveBeenCalledWith(null)
})

it('does not restore a canceled record draft from a delayed shielded address', async () => {
  const shielded = Promise.withResolvers<string>()
  const setters = {
    setRecordDrafts: vi.fn(), setRecordError: vi.fn(), setRecordTxState: vi.fn(),
    setPrimaryEndpointValue: vi.fn(), setPrimaryError: vi.fn(), setRenewalYears: vi.fn(),
  }
  const inputs = {
    appRuntime: {}, activityFeed: {}, derivedState: {}, economicsRuntime: {}, searchRuntime: {}, searchState: {},
    namePreview: { result: {}, renewalPreviewLifecycle: { expiresAt: 123 } },
    domainState: { ...setters, managedName: { expiresAt: 123 } },
    domainRecordState: { ...setters, recordDraftMutations: [], moonlightRecord: { value: 'forward-record' } },
    walletRuntime: { submitNameWrite: { captureWorkspace: () => () => true, captureSession: () => () => true }, requestSelectedShieldedAddress: () => shielded.promise, selectedAddress: 'public', walletSession: {} },
  } as unknown as UseDomainManagementFeatureProps
  let views!: ReturnType<typeof useDomainManagementFeature>
  function Probe() {
    views = useDomainManagementFeature(inputs)
    return null
  }
  renderToStaticMarkup(createElement(Probe))

  const request = views.recordsProps.wallet.onUseWalletShieldedAddress()
  views.recordsProps.draft.onDiscardDrafts()
  const callsAfterCancel = setters.setRecordDrafts.mock.calls.length
  shielded.resolve('dusk1shielded-from-canceled-editor')
  await request

  expect(setters.setRecordDrafts).toHaveBeenCalledTimes(callsAfterCancel)
})
