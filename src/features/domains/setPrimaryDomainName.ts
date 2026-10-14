import type { NameRef } from '@duskdomains/sdk'
import {
  storeClearPrimaryNameRequest,
  storeSetPrimaryNameRequest,
  userFacingErrorMessage,
  type DuskDomainsOnChainPrimaryLink,
  type DuskDomainsOnChainPrimaryTarget,
} from '../../names/internal'
import { primaryElsewhere } from '../../names/primaryLinks'
import { refusalReason } from '../../names/ui/txFailure'
import { sameAuthority } from '../identity/ownerLabel'
import { guardDomainActionPrerequisite } from './domainActionGuards'
import type { UsePrimaryDomainActionsProps } from './usePrimaryDomainActions'

/**
 * A primary name change that takes two wallet approvals. A store sets a primary name only while no
 * other store holds the Dusk address's primary link, and only the address can clear that link, in
 * its own store: the first approval clears `current` there, the second sets `target`.
 */
export type PrimarySwitch = {
  /** The Dusk address whose primary name changes: the connected wallet's, `target`'s record. */
  endpoint: string
  current: string
  /** The store keeping the link to `current`, and the link's mapping. */
  store: string
  mappingId: string
  target: string
  /** `target`'s key and incarnation as reviewed: the set is bound to them. */
  targetRef: NameRef
  step: 'review' | 'clearing' | 'setting'
}

/** The change shown on this page: for this name and this Dusk address only. */
export function primarySwitchFor(primarySwitch: PrimarySwitch | null | undefined, displayName: string, endpoint: string) {
  return primarySwitch && primarySwitch.target === displayName && primarySwitch.endpoint === endpoint ? primarySwitch : null
}

type TargetCheck =
  | { ok: true; target: DuskDomainsOnChainPrimaryTarget; elsewhere: DuskDomainsOnChainPrimaryLink | null }
  | { ok: false; reason: string }

/**
 * Every set_primary precondition, read from the chain at one height: the address set is the name's
 * own Dusk address record, which the connected wallet is, the signer its owner or manager, and the
 * name current. `elsewhere` is a link another store keeps for the address. Null without a chain, in
 * preview.
 */
async function checkTarget({ duskDomainsOnChainClient: chain, displayName, selectedAddress }: UsePrimaryDomainActionsProps): Promise<TargetCheck | null> {
  if (!chain) return null
  const result = await chain.checkPrimaryTarget(displayName, selectedAddress)
  if (!result.ok) return {
    ok: false,
    reason: result.error.code === 'not_primary_eligible' ? result.error.message
      : `Couldn’t check ${displayName} on chain right now, so nothing was sent. Try again.`,
  }
  const target = result.value
  return { ok: true, target, elsewhere: target.links.find(link => !sameAuthority(link.store, target.store)) ?? null }
}

const sameRef = (a: NameRef, b: NameRef) =>
  JSON.stringify(a, (_, value: unknown) => typeof value === 'bigint' ? String(value) : value)
    === JSON.stringify(b, (_, value: unknown) => typeof value === 'bigint' ? String(value) : value)

/**
 * Sets the name as the primary name of `endpoint`, bound to `nameRef` when the chain was read.
 * Resolves whether the chain set it.
 */
async function submitSetPrimary(props: UsePrimaryDomainActionsProps, workspace: () => boolean, endpoint: string, nameRef?: NameRef) {
  const {
    appendActivity, displayName, nodeHex, moonlightRecord, runtimeConfig, selectedAuthority, selectedAddress,
    setPrimaryEndpointValue, setPrimaryName, setConnectedPrimaryName, setPrimaryTxState, shouldApplyPreviewWriteFallback, submitNameWrite,
  } = props
  const call = {
    ...storeSetPrimaryNameRequest({
      endpointType: 'moonlight_address',
      endpointValue: endpoint,
      node: nodeHex,
      name: displayName,
    }),
    ...(nameRef ? { nameRef } : {}),
  }
  const finalState = await submitNameWrite(displayName, call, {
    workspace,
    contracts: runtimeConfig.contracts,
    onUpdate: setPrimaryTxState,
  })
  if (!workspace() || finalState.status !== 'executed') return { executed: false, finalState }
  // Live data that confirms the change replaces the page's; without it the change is applied here.
  if (!(await shouldApplyPreviewWriteFallback('primary name', async (client) => {
    const indexed = await client.getPrimaryName({
      type: 'moonlight_address',
      value: endpoint,
    })
    return indexed === displayName
  }, workspace)) || !workspace()) return { executed: true, finalState }

  if (moonlightRecord?.value === endpoint) setPrimaryName(displayName)
  if (selectedAddress === endpoint) setConnectedPrimaryName(displayName)
  setPrimaryEndpointValue(endpoint)
  appendActivity({
    eventType: 'primary_name_set',
    actor: selectedAuthority,
    target: `moonlight_address:${endpoint}`,
    txId: finalState.txId,
  })
  return { executed: true, finalState }
}

export async function setPrimaryDomainName(props: UsePrimaryDomainActionsProps) {
  const {
    canSetPrimary,
    displayName,
    primaryEndpoint,
    selectedAddress,
    setPrimaryError,
    setPrimarySwitch,
    setPrimaryTxState,
    submitNameWrite,
    walletSetupState,
    ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite,
  } = props
  const workspace = submitNameWrite.captureWorkspace(displayName)
  setPrimaryError('')
  setPrimarySwitch(null)
  if (!guardDomainActionPrerequisite({
    canContinue: canSetPrimary,
    setError: setPrimaryError,
      walletSetupState,
    blockedCopy: 'Connect the manager wallet and enter a valid Dusk address before setting a primary name.',
  })) {
    return
  }
  if (!ensureContractAuthorityForLiveWrite('set the primary name', setPrimaryError)) return
  if (!(await ensurePublicBalanceForLiveWrite('setting the primary name', message => { if (workspace()) setPrimaryError(message) }))) return

  if (!workspace()) return

  try {
    // Nothing is asked of the wallet unless the chain would set it: a refusal says why. A link
    // another store keeps is cleared there first instead, with two approvals.
    const check = await checkTarget(props)
    if (!workspace()) return
    if (check && !check.ok) {
      setPrimaryError(check.reason)
      return
    }
    if (check?.elsewhere) {
      const { name, store, mappingId } = check.elsewhere
      setPrimarySwitch({ endpoint: selectedAddress, current: name, store, mappingId, target: displayName, targetRef: check.target.nameRef, step: 'review' })
      return
    }
    // The address set is the one the chain checked: the connected wallet's, the name's record.
    const endpoint = check ? selectedAddress : primaryEndpoint
    const { finalState } = await submitSetPrimary(props, workspace, endpoint, check?.target.nameRef)
    if (!workspace()) return
    // Preparation found a link in another store after all, and sent nothing.
    const found = primaryElsewhere(finalState.error)
    if (found && check) {
      setPrimaryTxState(null)
      setPrimarySwitch({ endpoint: selectedAddress, current: found.current, store: found.store, mappingId: found.mappingId,
        target: displayName, targetRef: check.target.nameRef, step: 'review' })
      return
    }
    // A transaction the chain refused says why, also when only its receipt names the reason.
    if (finalState.status === 'failed' && finalState.txId) {
      const reason = refusalReason(finalState, 'set_primary_name')
      if (reason) setPrimaryError(reason)
    }
  } catch (error) {
    if (!workspace()) return
    setPrimaryError(userFacingErrorMessage(error))
  }
}

/**
 * The two approvals of a reviewed primary name change: clear the link to `current` in its store, then,
 * once the chain confirms that, set `target`. Every set_primary precondition is read from the chain
 * again before each approval. A link already gone needs only the second approval.
 */
export async function switchPrimaryDomainName(props: UsePrimaryDomainActionsProps) {
  const {
    displayName,
    primarySwitch,
    runtimeConfig,
    selectedAddress,
    setConnectedPrimaryName,
    setPrimaryError,
    setPrimarySwitch,
    setPrimaryTxState,
    submitNameWrite,
  } = props
  const review = primarySwitchFor(primarySwitch, displayName, selectedAddress)
  if (review?.step !== 'review') return
  const workspace = submitNameWrite.captureWorkspace(displayName)
  const { current, target } = review
  const stop = (message: string) => {
    setPrimarySwitch(null)
    setPrimaryError(message)
  }
  setPrimaryError('')
  if (!(await props.ensurePublicBalanceForLiveWrite('changing the primary name', message => { if (workspace()) setPrimaryError(message) }))) return
  if (!workspace()) return
  try {
    const before = await checkTarget(props)
    if (!workspace()) return
    if (!before) return stop(`${target} can’t be checked on chain here, so nothing was sent.`)
    if (!before.ok) return stop(before.reason)
    if (!sameRef(before.target.nameRef, review.targetRef)) return stop(`${target} changed since you reviewed it. Turn Primary name on again to check it.`)
    const link = before.elsewhere
    // Another link or mapping than the one reviewed: show it before anything is signed.
    if (link && (link.name !== current || !sameAuthority(link.store, review.store) || link.mappingId !== review.mappingId)) {
      setPrimarySwitch({ ...review, current: link.name, store: link.store, mappingId: link.mappingId })
      setPrimaryError('Your primary name changed since you reviewed it. Check it again before continuing.')
      return
    }
    if (link) {
      setPrimarySwitch({ ...review, step: 'clearing' })
      const cleared = await submitNameWrite(displayName, {
        ...storeClearPrimaryNameRequest({ endpointType: 'moonlight_address', endpointValue: selectedAddress }),
        // Only the mapping reviewed is cleared: preparation refuses another.
        reviewedPrimary: { name: current, store: review.store, mappingId: review.mappingId },
      }, {
        workspace,
        contracts: runtimeConfig.contracts,
        onUpdate: setPrimaryTxState,
      })
      if (!workspace()) return
      if (cleared.status !== 'executed') {
        // Preparation refused it, so nothing was sent: its reason is the whole story.
        if (cleared.status === 'failed' && !cleared.txId && cleared.message) {
          setPrimaryTxState(null)
          return stop(cleared.message)
        }
        return stop(cleared.status === 'rejected' ? `Nothing changed: ${current} is still your primary name.`
          : `${current} is still your primary name, so ${target} wasn’t set. ${refusalReason(cleared, 'clear_primary_name')}`.trim())
      }
      // The chain cleared it; the second approval doesn't wait for the indexer to say so.
      setConnectedPrimaryName(null)
    }
    const lead = link ? `${current} is no longer your primary name, and ${target} wasn’t set.` : `${target} wasn’t set as your primary name.`
    // Every precondition again, for the second approval.
    const after = link ? await checkTarget(props) : before
    if (!workspace()) return
    if (!after) return stop(`${lead} It can’t be checked on chain here.`)
    if (!after.ok) return stop(`${lead} ${after.reason}`)
    if (!sameRef(after.target.nameRef, review.targetRef)) return stop(`${lead} ${target} changed since you reviewed it. Turn Primary name on again to check it.`)
    if (after.elsewhere) return stop(`${lead} ${after.elsewhere.name} is your primary name again, kept in another shard. Turn Primary name on again to change it.`)
    setPrimarySwitch({ ...review, step: 'setting' })
    const { executed, finalState } = await submitSetPrimary(props, workspace, selectedAddress, review.targetRef)
    if (!workspace()) return
    setPrimarySwitch(null)
    if (executed) return
    if (finalState.status === 'failed' && !finalState.txId) setPrimaryTxState(null)
    setPrimaryError(`${lead} ${finalState.status === 'rejected' ? 'The wallet request was rejected. Turn Primary name on again to set it.'
      : refusalReason(finalState, 'set_primary_name') || 'Turn Primary name on again to set it.'}`)
  } catch (error) {
    if (!workspace()) return
    stop(userFacingErrorMessage(error))
  }
}
