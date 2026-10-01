import { expect, it, vi } from 'vitest'
import { renewDomainName } from './renewDomainName'

it('asks for the owner or manager when renewal is unavailable', async () => {
  const setRenewalError = vi.fn(), submitNameWrite = vi.fn()
  await renewDomainName({ canRenewName: false, walletSetupState: 'connected', setRenewalError, submitNameWrite } as never)
  expect(setRenewalError).toHaveBeenLastCalledWith('Connect the owner or manager wallet before renewing this name.')
  expect(submitNameWrite).not.toHaveBeenCalled()
})
