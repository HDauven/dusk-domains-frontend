import { expect, it, vi } from 'vitest'
import { createSubdomain } from './createSubdomain'
import { deriveRecordCapabilities } from '../../app/derived/recordCapabilities'

it('creates a subname managed by the connected account when Manager is empty', async () => {
  const authority = `0x${'11'.repeat(32)}`
  const submitNameWrite = Object.assign(vi.fn(async () => ({ status: 'rejected' })), { captureWorkspace: () => () => true })
  const setSubnameError = vi.fn()
  const props = {
    canCreateSubname: true, displayName: 'alpha.dusk', selectedAddress: 'address', selectedAuthority: authority,
    walletSetupState: 'connected', walletAuthorized: true, nodeHex: 'node', subnameBusy: false,
    subnameLabel: 'pay', subnameManager: '', recordSourceContractId: 'resolver', subnameExpiryPolicy: 'inherits_parent',
    subnameExpiryDate: '', managedNameExpiresAt: 100_000, currentBlockHeight: 100, nowSeconds: 1_790_000_000,
    managedName: { owner: authority, manager: authority, expiresAt: 100_000, graceEndsAt: 110_000 },
    runtimeConfig: { contracts: {} }, setSubnameError, setSubnameTxState: vi.fn(), submitNameWrite,
    ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
  }
  expect(deriveRecordCapabilities(props as never).canCreateSubname).toBe(true)
  await createSubdomain(props as never)
  expect(setSubnameError).toHaveBeenCalledExactlyOnceWith('')
  expect(submitNameWrite).toHaveBeenCalledWith('alpha.dusk', expect.objectContaining({
    args: expect.objectContaining({ name: 'pay.alpha.dusk', owner: authority, manager: authority }),
  }), expect.anything())
})
