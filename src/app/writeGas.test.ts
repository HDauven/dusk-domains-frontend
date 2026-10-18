import { expect, it, vi } from 'vitest'
import { storeCommitCall, vaultClaimReferralCall, vaultClaimProtocolCall, type FrozenCall } from '@duskdomains/sdk'
import { createDuskDomainsConnectApp } from '@duskdomains/sdk/connect-app'
import { contracts } from '../test/frozenFixtures'
import { frozenNode } from '../test/frozenNode'

it('uses the frozen action gas policy and rejects a modified gas/deposit before signing', async () => {
 const commit=storeCommitCall(contracts.store.contractId,{hash:Array(32).fill(1)})
 const payout=vaultClaimReferralCall(contracts.vault.contractId,{amount:'All',recipient:Array(96).fill(1)})
 const protocol=vaultClaimProtocolCall(contracts.vault.contractId,{amount:'All',expected_operator_epoch:1n})
 expect(protocol.gasLimit).toBe(242_000_000n)
 const wallet={request:vi.fn(async(method:string)=>method==='dusk_chainId'?'dusk:0':{median:'3'})}
 // Connect signs only for contracts its client verified.
 const client=frozenNode().client()
 for(const call of [commit,payout]) await client.verifyContract(call.role,call.contractId)
 const app=createDuskDomainsConnectApp(wallet,client.release)
 for(const call of [commit,payout,protocol]) {
  expect(await app.prepare(call as FrozenCall)).toMatchObject({gas:{limit:call.gasLimit.toString(),price:'3'},deposit:call.deposit})
  await expect(app.submit({...call,gasLimit:1n} as FrozenCall)).rejects.toThrow('gas policy')
 }
 expect(wallet.request.mock.calls.some(([method])=>method==='dusk_sendTransaction')).toBe(false)
})
