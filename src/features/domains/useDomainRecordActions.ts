import type { UseDomainRecordActionsProps } from './domainRecordActionTypes'
import { saveDomainRecords } from './saveDomainRecords'

export function useDomainRecordActions(props: UseDomainRecordActionsProps) {
  async function handleRecordsSave() {
    return saveDomainRecords(props)
  }

  return {
    handleRecordsSave,
  }
}
