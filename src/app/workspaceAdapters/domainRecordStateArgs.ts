import { editableRecordKeys } from '../appConstants'
import type { UseDomainRecordStateArgs } from '../../features/domains/useDomainRecordState'
import type { AppCoreRuntimes } from '../useAppCoreRuntimes'
import type { NamePreview } from './types'

export function buildDomainRecordStateArgs({
  core,
  namePreview,
}: {
  core: AppCoreRuntimes
  namePreview: NamePreview
}): UseDomainRecordStateArgs {
  return {
    activeSubnames: core.domainState.activeSubnames,
    displayName: namePreview.displayName,
    editableRecordKeys,
    nodeHex: namePreview.nodeHex,
  }
}
