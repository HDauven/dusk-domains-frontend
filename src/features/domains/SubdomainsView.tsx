import { Panel } from '../../components/ui/Panel'
import { Info } from 'lucide-react'
import { PanelHeader } from '../../components/ui/PanelHeader'
import { formatLifecycleDay } from './domainFormat'
import { ManagementFeedback } from './ManagementFeedback'
import { SubdomainCreatePanel } from './subdomains/SubdomainCreatePanel'
import { SubdomainList } from './subdomains/SubdomainList'
import type { SubdomainsViewProps } from './subdomains/types'

export function SubdomainsView({ displayName, error, managedNameExpiresAt, onRecordTargetSelect, subnames, txState, authority, creation, clock }: SubdomainsViewProps) {
  const { canEdit = true } = authority
  const { subnameLabel } = creation
  const { currentBlockHeight, nowSeconds } = clock
  const parentExpiryDay = formatLifecycleDay(managedNameExpiresAt, currentBlockHeight, nowSeconds)
  const subdomainPreview = subnameLabel.trim()
    ? `${subnameLabel.trim().toLowerCase()}.${displayName}`
    : `label.${displayName}`

  return (
    <Panel className="subnames-panel" aria-labelledby="subnames-heading">
      <PanelHeader
        headingId="subnames-heading"
        subtitle={`Names under ${displayName}, like pay.${displayName}. Each can point somewhere else and have its own manager.`}
        title="Subnames"
      />

      <div className="subname-box" aria-label="Subname controls">
        {canEdit ? <SubdomainCreatePanel displayName={displayName} parentExpiryDay={parentExpiryDay} subdomainPreview={subdomainPreview} creation={creation} authority={authority} /> : null}

        {subnames.length ? (
          <SubdomainList onRecordTargetSelect={onRecordTargetSelect} subnames={subnames} authority={authority} clock={clock} />
        ) : (
          <div className="activity-empty">
            <Info size={18} />
            <span>No subnames yet.</span>
          </div>
        )}

        <ManagementFeedback error={error} txState={txState} />
      </div>
    </Panel>
  )
}

export type { SubdomainsViewProps } from './subdomains/types'
