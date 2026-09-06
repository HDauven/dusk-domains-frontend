import { expect, it, vi } from 'vitest'
import { buildDomainManagementProps } from './domainManagementProps'
import type { UseDomainManagementFeatureProps } from './domainManagementFeatureTypes'

it('preserves record consent resets, wallet errors, primary fallback and renewal bounds', async () => {
  const setters = {
    setRecordDrafts: vi.fn(), setRecordError: vi.fn(), setRecordTargetNode: vi.fn(),
    setPublicRecordAcknowledged: vi.fn(), setCriticalRecordConfirmation: vi.fn(),
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
    handleResolverUpdate: vi.fn(), handleCreateSubname: vi.fn(), handleDelegateSubname: vi.fn(),
    handleRevokeSubname: vi.fn(),
  }
  const views = buildDomainManagementProps(props, actions)
  expect(views.primaryProps.placeholder).toBe('public')
  expect(views.recordsProps.recordDraftMutationCount).toBe(2)
  expect(views.subdomainsProps.managedNameExpiresAt).toBe(123)
  views.primaryProps.onEndpointChange('new-endpoint')
  expect(setters.setPrimaryEndpointValue).toHaveBeenCalledWith('new-endpoint')
  expect(setters.setPrimaryError).toHaveBeenCalledWith('')
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

  for (const select of [
    () => views.recordsProps.onRecordTargetChange('child'),
    () => views.subdomainsProps.onRecordTargetSelect({ node: 'child' } as Parameters<typeof views.subdomainsProps.onRecordTargetSelect>[0]),
  ]) {
    vi.clearAllMocks()
    select()
    expect(setters.setRecordTargetNode).toHaveBeenCalledWith('child')
    expect(setters.setRecordDrafts).toHaveBeenCalledWith({})
    expect(setters.setRecordError).toHaveBeenCalledWith('')
    expect(setters.setPublicRecordAcknowledged).toHaveBeenCalledWith(false)
    expect(setters.setCriticalRecordConfirmation).toHaveBeenCalledWith('')
  }
  expect(buildDomainManagementProps({ ...props, selectedAddress: '' }, actions).primaryProps.placeholder).toBe('forward-record')
  expect(buildDomainManagementProps({ ...props, selectedAddress: '', moonlightRecord: undefined }, actions).primaryProps.placeholder).toBe('dusk1...')
})
