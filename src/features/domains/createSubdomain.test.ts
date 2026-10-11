import { expect, it, vi } from 'vitest'
import { createSubdomain } from './createSubdomain'
import { deriveRecordCapabilities } from '../../app/derived/recordCapabilities'

it.each(['pay', 'docs', 'wallet', 'support'])('creates %s with the current account as manager when Manager is empty', async (label) => {
  const authority = `0x${'11'.repeat(32)}`
  const submitNameWrite = Object.assign(vi.fn(async () => ({ status: 'rejected' })), { captureWorkspace: () => () => true })
  const setSubnameError = vi.fn()
  const props = {
    canCreateSubname: true, displayName: 'alpha.dusk', selectedAddress: 'address', selectedAuthority: authority,
    walletSetupState: 'connected', walletAuthorized: true, nodeHex: 'node', subnameBusy: false,
    subnameLabel: label, subnameManager: '', recordSourceContractId: 'resolver', subnameExpiryPolicy: 'inherits_parent',
    subnameExpiryDate: '', managedNameExpiresAt: 100_000, currentBlockHeight: 100, nowSeconds: 1_790_000_000,
    managedName: { owner: authority, manager: authority, expiresAt: 100_000, graceEndsAt: 110_000 },
    runtimeConfig: { contracts: {} }, setSubnameError, setSubnameTxState: vi.fn(), submitNameWrite,
    ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
  }
  expect(deriveRecordCapabilities(props as never).canCreateSubname).toBe(true)
  await createSubdomain(props as never)
  expect(setSubnameError).toHaveBeenCalledExactlyOnceWith('')
  expect(submitNameWrite).toHaveBeenCalledWith('alpha.dusk', expect.objectContaining({
    args: expect.objectContaining({ name: `${label}.alpha.dusk`, owner: authority, manager: authority }),
  }), expect.anything())
})

it.each([
  { label: 'bad\uD800', manager: '', message: 'Name contains malformed Unicode. Remove or retype the invalid character.' },
  { label: 'bad\uDC00', manager: '', message: 'Name contains malformed Unicode. Remove or retype the invalid character.' },
  { label: 'pay', manager: `contract:0x01${'00'.repeat(31)}`, message: 'Subname manager cannot be the Dusk transfer contract. Enter a public Dusk address or another contract.' },
])('refuses invalid subname input before requesting a signature: $label / $manager', async ({ label, manager, message }) => {
  const submitNameWrite = Object.assign(vi.fn(), { captureWorkspace: () => () => true })
  const setSubnameError = vi.fn()
  await createSubdomain({
    canCreateSubname: true, displayName: 'alpha.dusk', selectedAddress: 'address', selectedAuthority: `0x${'11'.repeat(32)}`,
    subnameLabel: label, subnameManager: manager, recordSourceContractId: '', subnameExpiryPolicy: 'inherits_parent',
    managedNameExpiresAt: 100_000, setSubnameError, submitNameWrite,
    ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
  } as never)
  expect(setSubnameError).toHaveBeenLastCalledWith(message)
  expect(submitNameWrite).not.toHaveBeenCalled()
})
