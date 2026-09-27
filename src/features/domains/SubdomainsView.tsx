import { Info } from 'lucide-react'
import { PanelHeader } from '../../components/ui/PanelHeader'
import { formatLifecycleDay } from './domainFormat'
import { ManagementFeedback } from './ManagementFeedback'
import { SubdomainCreatePanel } from './subdomains/SubdomainCreatePanel'
import { SubdomainList } from './subdomains/SubdomainList'
import type { SubdomainsViewProps } from './subdomains/types'

export function SubdomainsView({
  canCreateSubname,
  currentBlockHeight,
  displayName,
  error,
  fallbackManager,
  managedNameExpiresAt,
  nowSeconds,
  onCreateSubname,
  onRecordTargetSelect,
  onSubnameExpiryDateChange,
  onSubnameExpiryPolicyChange,
  onSubnameLabelChange,
  onSubnameManagerChange,
  onSubnameResolverChange,
  onSubnameRevocationPolicyChange,
  selectedAuthority,
  subnameExpiryDate,
  subnameExpiryPolicy,
  subnameLabel,
  subnameManager,
  subnameResolver,
  subnameRevocationPolicy,
  subnames,
  txState,
}: SubdomainsViewProps) {
  const parentExpiryDay = formatLifecycleDay(managedNameExpiresAt, currentBlockHeight, nowSeconds)
  const subdomainPreview = subnameLabel.trim()
    ? `${subnameLabel.trim().toLowerCase()}.${displayName}`
    : `label.${displayName}`

  return (
    <section className="subnames-panel" aria-labelledby="subnames-heading">
      <PanelHeader
        headingId="subnames-heading"
        subtitle={`Names under ${displayName}, like pay.${displayName}. Each can point somewhere else and have its own manager.`}
        title="Subnames"
      />

      <div className="subname-box" aria-label="Subdomain controls">
        <SubdomainCreatePanel
          canCreateSubname={canCreateSubname}
          displayName={displayName}
          fallbackManager={fallbackManager}
          onCreateSubname={onCreateSubname}
          onSubnameExpiryDateChange={onSubnameExpiryDateChange}
          onSubnameExpiryPolicyChange={onSubnameExpiryPolicyChange}
          onSubnameLabelChange={onSubnameLabelChange}
          onSubnameManagerChange={onSubnameManagerChange}
          onSubnameResolverChange={onSubnameResolverChange}
          onSubnameRevocationPolicyChange={onSubnameRevocationPolicyChange}
          parentExpiryDay={parentExpiryDay}
          selectedAuthority={selectedAuthority}
          subdomainPreview={subdomainPreview}
          subnameExpiryDate={subnameExpiryDate}
          subnameExpiryPolicy={subnameExpiryPolicy}
          subnameLabel={subnameLabel}
          subnameManager={subnameManager}
          subnameResolver={subnameResolver}
          subnameRevocationPolicy={subnameRevocationPolicy}
        />

        {subnames.length ? (
          <SubdomainList
            currentBlockHeight={currentBlockHeight}
            nowSeconds={nowSeconds}
            onRecordTargetSelect={onRecordTargetSelect}
            subnames={subnames}
          />
        ) : (
          <div className="activity-empty">
            <Info size={18} />
            <span>No subnames yet.</span>
          </div>
        )}

        <ManagementFeedback error={error} txState={txState} />
      </div>
    </section>
  )
}

export type { SubdomainsViewProps } from './subdomains/types'
