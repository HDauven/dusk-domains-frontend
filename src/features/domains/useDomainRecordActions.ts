import type { ResolverRecord } from '../../names/internal'
import { clearDomainRecord } from './clearDomainRecord'
import type { UseDomainRecordActionsProps } from './domainRecordActionTypes'
import { saveDomainRecords } from './saveDomainRecords'

export function useDomainRecordActions(props: UseDomainRecordActionsProps) {
  async function handleRecordsSave() {
    return saveDomainRecords(props)
  }

  async function handleRecordClear(record: ResolverRecord) {
    await clearDomainRecord(props, record)
  }

  return {
    handleRecordClear,
    handleRecordsSave,
  }
}
