import type { Dispatch, SetStateAction } from 'react'
import { sameAuthority } from '../features/identity/ownerLabel'
import { waitForIndexerConfirmation, type DuskDomainCallMetadata, type DuskDomainsIndexerClient, type DuskDomainsOnChainClient } from '../names/internal'
import type { ManagedNameState } from './managedNameState'

export type PendingOwnership = { node: string; name: string; message: string; checking: boolean }

const coreChanges = new Set(['update_authorities', 'escrow_fixed_sale', 'escrow_auction', 'accept_marketplace_offer'])
const marketplaceChanges = new Set(['buy_fixed_sale', 'cancel_fixed_sale', 'expire_fixed_sale', 'cancel_auction', 'expire_auction', 'settle_auction'])

export function createOwnershipConfirmation({ indexerClient, onChainClient, setManagedName, setPending }: {
  indexerClient: DuskDomainsIndexerClient | null
  onChainClient: DuskDomainsOnChainClient | null
  setManagedName: Dispatch<SetStateAction<ManagedNameState>>
  setPending: (pending: PendingOwnership[]) => void
}) {
  const pending = new Map<string, PendingOwnership>()
  const reads = new Map<string, number>()
  const running = new Map<string, Promise<boolean>>()
  const publish = () => setPending([...pending.values()])
  const invalidateReads = (node: string) => reads.set(node, (reads.get(node) ?? 0) + 1)

  async function confirm(node: string) {
    const entry = pending.get(node)
    if (!entry) return false
    const version = reads.get(node)
    pending.set(node, { ...entry, checking: true })
    publish()
    try {
      if (!indexerClient || !onChainClient) return false
      // This height is read after execution, so pre-transaction projections cannot confirm it.
      const height = await onChainClient.getCurrentBlockHeight()
      if (!height.ok) return false
      let authorities: Pick<ManagedNameState, 'owner' | 'manager' | 'expiresAt' | 'graceEndsAt'> | null = null
      const result = await waitForIndexerConfirmation({
        description: 'ownership change', attempts: 15, delayMs: 1_000,
        check: async () => {
          const health = await indexerClient.getHealth()
          if (!health.ok || (health.finalizedBlockHeight ?? -1) < height.value) return false
          const state = await indexerClient.getNameState(node)
          const canonical = await onChainClient.getNameByNode(node)
          if (!state || state.node !== node || !canonical.ok || canonical.value.node !== node || !canonical.value.record) return false
          const { owner, manager, lifecycle } = canonical.value.record
          if (!sameAuthority(state.owner ?? '', owner) || !sameAuthority(state.manager ?? '', manager)) return false
          authorities = { owner, manager, expiresAt: lifecycle.expiresAtBlock, graceEndsAt: lifecycle.graceEndsAtBlock }
          return true
        },
      })
      if (!result.confirmed || !authorities || reads.get(node) !== version) return false
      invalidateReads(node)
      pending.delete(node)
      setManagedName(current => current.node === node ? { ...current, ...authorities } : current)
      return true
    } catch {
      return false
    } finally {
      const current = pending.get(node)
      if (current && reads.get(node) === version) pending.set(node, { ...current, checking: false })
      publish()
    }
  }

  function retry(node: string) {
    const existing = running.get(node)
    if (existing) return existing
    const request = confirm(node).finally(() => { if (running.get(node) === request) running.delete(node) })
    running.set(node, request)
    return request
  }

  return {
    retry,
    beginRead: (node: string) => {
      const version = reads.get(node)
      return () => reads.get(node) === version
    },
    setManagedName: (update: SetStateAction<ManagedNameState>) => {
      const blocked = new Set(pending.keys())
      setManagedName(current => {
        const next = typeof update === 'function' ? update(current) : update
        return blocked.has(next.node) || pending.has(next.node) ? { ...next, owner: '', manager: '' } : next
      })
    },
    afterWrite: (name: string, call: DuskDomainCallMetadata, kind?: 'transfer' | 'manager'): Promise<boolean> | undefined => {
      if (!(call.contract === 'store' && coreChanges.has(call.functionName))
        && !(call.contract === 'marketplace' && marketplaceChanges.has(call.functionName))) return
      const node = (call.args as { node: string }).node
      pending.set(node, { node, name, checking: true, message: kind === 'manager' ? 'Manager change sent. Confirming…' : 'Transfer sent. Confirming…' })
      invalidateReads(node)
      running.delete(node)
      setManagedName(current => current.node === node ? { ...current, owner: '', manager: '' } : current)
      publish()
      return retry(node)
    },
  }
}
