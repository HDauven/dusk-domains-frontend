import type { ActivityEntry } from '../../names/internal'
import { explorerTransactionUrl } from '../../app/explorer'
import { activityActions, type ActivityContext } from './activityActions'
import type { ActivityParty } from './activityEvents'

const columns = ['Date (UTC)', 'Block', 'Action', 'Details', 'By', 'Transaction', 'Explorer link']

// Full values, not the short forms the page shows, so a row can be checked against the chain.
function fullParty(party: ActivityParty) {
  if (party.kind === 'address') return party.address
  if (party.kind === 'authority') return party.authority
  if (party.kind === 'contract') return party.contract
  return 'Marketplace'
}

// Quote every cell, and stop a spreadsheet from reading a leading = + - @ as a formula.
function cell(value: string | number | null | undefined) {
  const text = String(value ?? '')
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

/** The name's history as CSV, oldest first, one row per action. */
export function activityCsv(entries: readonly ActivityEntry[], context: Omit<ActivityContext, 'label'> & { explorerUrl?: string | null }) {
  const actions = activityActions(entries, { ...context, label: fullParty }).reverse()
  const rows = actions.map(action => [
    Number.isFinite(Date.parse(action.timestamp)) ? new Date(action.timestamp).toISOString().replace('.000Z', 'Z') : '',
    action.blockHeight ?? '',
    action.title,
    action.details.join('; '),
    action.actor ? fullParty(action.actor) : '',
    action.txId ?? '',
    explorerTransactionUrl(context.explorerUrl, action.txId) ?? '',
  ])
  return [columns, ...rows].map(row => row.map(cell).join(',')).join('\r\n') + '\r\n'
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  // Some browsers start the download after the click returns.
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
