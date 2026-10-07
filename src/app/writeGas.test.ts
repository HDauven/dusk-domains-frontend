import { expect, it, vi } from 'vitest'
import { storeCommitCall, vaultClaimReferralCall, type FrozenCall } from '@duskdomains/sdk'
import { createDuskDomainsConnectApp } from '@duskdomains/sdk/connect-app'
import { contracts } from '../test/frozenFixtures'

it('uses the frozen action gas policy and rejects a modified gas/deposit before signing', async () => {
 const commit=storeCommitCall(contracts.store.contractId,{hash:Array(32).fill(1)})
 const payout=vaultClaimReferralCall(contracts.vault.contractId,{amount:'All',recipient:Array(96).fill(1)})
 const wallet={request:vi.fn(async(method:string)=>method==='dusk_chainId'?'dusk:0':{median:'3'})}
 const release={manifest:{chainId:'dusk:0'},contracts:new Map([[commit.contractId,{role:'store'}],[payout.contractId,{role:'vault'}]]),drivers:new Map([commit,payout].map(call=>[call.contractId,{encodeInput:()=>new Uint8Array([1])}]))}
 const app=createDuskDomainsConnectApp(wallet,release as never)
 for(const call of [commit,payout]) {
  expect(await app.prepare(call as FrozenCall)).toMatchObject({gas:{limit:call.gasLimit.toString(),price:'3'},deposit:call.deposit})
  await expect(app.submit({...call,gasLimit:1n} as FrozenCall)).rejects.toThrow('gas policy')
 }
 expect(wallet.request.mock.calls.some(([method])=>method==='dusk_sendTransaction')).toBe(false)
})
