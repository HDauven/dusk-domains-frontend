import { expect, it } from 'vitest'
import type { ActivityEntry, RecentChangeWarning } from '../../names/internal'
import { activityActions, paymentWarnings } from './activityActions'
const entry=(eventType:ActivityEntry['eventType'],txId='tx',node='node'):ActivityEntry=>({id:`${eventType}:${txId}:${node}`,eventType,txId,node,name:'alpha.dusk',actor:'owner',timestamp:'',blockHeight:12})
it('shows one action for registration and primary transactions, preserving their details', () => {
  const entries=[entry('primary_name'),entry('record_update'),entry('transfer'),entry('registration')]
  const actions=activityActions(entries)
  expect(actions).toHaveLength(1)
  expect(actions[0].entry.eventType).toBe('registration')
  expect(actions[0].events).toHaveLength(4)
  expect(activityActions([entry('primary_name'),entry('record_update')])[0].entry.eventType).toBe('primary_name')
  expect(activityActions([entry('transfer','tx1'),entry('transfer','tx2'),entry('transfer','tx1','child')])).toHaveLength(3)
  expect(activityActions([{...entry('record_update'),id:'one',txId:undefined},{...entry('record_update'),id:'two',txId:undefined}])).toHaveLength(2)
})
it('warns only about payment records changed by another actor', () => {
  const warning=(actor:string,target:string,eventType='record_update')=>({actor,target,eventType}) as RecentChangeWarning
  const other=warning('other','moonlight_address')
  expect(paymentWarnings([warning('me','moonlight_address'),other,warning('other','website'),warning('other','moonlight_address:address','primary_name')],'me')).toEqual([other])
  expect(paymentWarnings([other],'')).toEqual([other])
})
