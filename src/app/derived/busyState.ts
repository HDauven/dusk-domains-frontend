import {
  isDuskDomainTxBusy,
  type DuskDomainTxState,
} from '../../names/internal'

export function deriveBusyState({
  commitTxState,
  managementTxState,
  primaryTxState,
  recordTxState,
  renewalTxState,
  subnameTxState,
  txState,
}: {
  commitTxState: DuskDomainTxState | null
  managementTxState: DuskDomainTxState | null
  primaryTxState: DuskDomainTxState | null
  recordTxState: DuskDomainTxState | null
  renewalTxState: DuskDomainTxState | null
  subnameTxState: DuskDomainTxState | null
  txState: DuskDomainTxState | null
}) {
  return {
    commitBusy: isDuskDomainTxBusy(commitTxState),
    managementBusy: isDuskDomainTxBusy(managementTxState),
    primaryBusy: isDuskDomainTxBusy(primaryTxState),
    recordBusy: isDuskDomainTxBusy(recordTxState),
    renewalBusy: isDuskDomainTxBusy(renewalTxState),
    subnameBusy: isDuskDomainTxBusy(subnameTxState),
    txBusy: isDuskDomainTxBusy(txState),
  }
}
