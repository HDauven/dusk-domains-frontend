import { expect, it, vi } from 'vitest'
import { buildDomainManagementProps } from './domainManagementProps'
import type { UseDomainManagementFeatureProps } from './domainManagementFeatureTypes'

it('discards drafts between inline edits and preserves wallet errors and renewal bounds', async () => {
  const setters = {
    setRecordDrafts: vi.fn(), setRecordError: vi.fn(), setRecordTxState: vi.fn(),
    setPrimaryEndpointValue: vi.fn(), setPrimaryError: vi.fn(), setRenewalYears: vi.fn(),
  }
  const requestSelectedShieldedAddress = vi.fn().mockResolvedValue('shielded')
  const props = {
    ...setters, requestSelectedShieldedAddress,
    managedName: { expiresAt: 123 }, recordDraftMutations: [{}, {}],
    selectedAddress: 'public', moonlightRecord: { value: 'forward-record' },
    clampDurationYears: (years: number) => Math.min(10, Math.max(1, years)),
  } as unknown as UseDomainManagementFeatureProps
  const actions = {
    handleClearPrimaryName: vi.fn(), handleSetPrimaryName: vi.fn(), handleRecordClear: vi.fn(),
    handleRecordsSave: vi.fn(), handleOwnershipUpdate: vi.fn(), handleRenewName: vi.fn(),
    handleCreateSubname: vi.fn(),
  }
  const views = buildDomainManagementProps(props, actions)
  expect(views.subdomainsProps.managedNameExpiresAt).toBe(123)
  views.settingsProps.onRenewalYearsChange(100)
  expect(setters.setRenewalYears).toHaveBeenCalledWith(10)

  views.recordsProps.onDraftValueChange('website', 'https://example.com')
  expect(setters.setRecordDrafts.mock.lastCall![0]({ avatar: 'existing' }))
    .toEqual({ avatar: 'existing', website: 'https://example.com' })
  views.recordsProps.onUseWalletPublicAddress()
  expect(setters.setRecordDrafts.mock.lastCall![0]({ avatar: 'existing' }))
    .toEqual({ avatar: 'existing', moonlight_address: 'public' })
  await views.recordsProps.onUseWalletShieldedAddress()
  expect(setters.setRecordDrafts.mock.lastCall![0]({ avatar: 'existing' }))
    .toEqual({ avatar: 'existing', phoenix_payment_endpoint: 'shielded' })
  requestSelectedShieldedAddress.mockRejectedValueOnce(new Error('Wallet locked'))
  await views.recordsProps.onUseWalletShieldedAddress()
  expect(setters.setRecordError).toHaveBeenLastCalledWith('Wallet locked')

  views.recordsProps.onDiscardDrafts()
  expect(setters.setRecordDrafts).toHaveBeenCalledWith({})
  expect(setters.setRecordError).toHaveBeenCalledWith('')
  expect(setters.setRecordTxState).toHaveBeenCalledWith(null)
})
