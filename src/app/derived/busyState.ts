import {
  isDuskNameTxBusy,
  type DuskNameTxState,
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
  commitTxState: DuskNameTxState | null
  managementTxState: DuskNameTxState | null
  primaryTxState: DuskNameTxState | null
  recordTxState: DuskNameTxState | null
  renewalTxState: DuskNameTxState | null
  subnameTxState: DuskNameTxState | null
  txState: DuskNameTxState | null
}) {
  return {
    commitBusy: isDuskNameTxBusy(commitTxState),
    managementBusy: isDuskNameTxBusy(managementTxState),
    primaryBusy: isDuskNameTxBusy(primaryTxState),
    recordBusy: isDuskNameTxBusy(recordTxState),
    renewalBusy: isDuskNameTxBusy(renewalTxState),
    subnameBusy: isDuskNameTxBusy(subnameTxState),
    txBusy: isDuskNameTxBusy(txState),
  }
}
