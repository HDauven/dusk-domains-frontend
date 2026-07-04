import { Info } from 'lucide-react'
import { PanelHeader } from '../../components/ui/PanelHeader'
import { formatLifecycleDay } from './domainFormat'
import { ManagementFeedback } from './ManagementFeedback'
import { SubdomainCreatePanel } from './subdomains/SubdomainCreatePanel'
import { SubdomainDelegationPanel } from './subdomains/SubdomainDelegationPanel'
import { SubdomainList } from './subdomains/SubdomainList'
import type { SubdomainsViewProps } from './subdomains/types'

export function SubdomainsView({
  canCreateSubname,
  canDelegateSubname,
  canRevokeSelectedSubname,
  currentBlockHeight,
  delegateManager,
  delegateSubnameNode,
  displayName,
  error,
  fallbackManager,
  managedNameExpiresAt,
  nowSeconds,
  onBack,
  onCreateSubname,
  onDelegateManagerChange,
  onDelegateSubnameChange,
  onDelegateSubnameSubmit,
  onRecordTargetSelect,
  onRevokeSubname,
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
        backLabel="Back to details"
        badge="Namespace"
        headingId="subnames-heading"
        onBack={onBack}
        subtitle={displayName}
        title="Subdomains"
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
          <>
            <SubdomainList
              currentBlockHeight={currentBlockHeight}
              delegateSubnameNode={delegateSubnameNode}
              nowSeconds={nowSeconds}
              onDelegateManagerChange={onDelegateManagerChange}
              onDelegateSubnameChange={onDelegateSubnameChange}
              onRecordTargetSelect={onRecordTargetSelect}
              subnames={subnames}
            />

            <SubdomainDelegationPanel
              canDelegateSubname={canDelegateSubname}
              canRevokeSelectedSubname={canRevokeSelectedSubname}
              delegateManager={delegateManager}
              delegateSubnameNode={delegateSubnameNode}
              fallbackManager={fallbackManager}
              onDelegateManagerChange={onDelegateManagerChange}
              onDelegateSubnameChange={onDelegateSubnameChange}
              onDelegateSubnameSubmit={onDelegateSubnameSubmit}
              onRevokeSubname={onRevokeSubname}
              selectedAuthority={selectedAuthority}
              subnames={subnames}
            />
          </>
        ) : (
          <div className="activity-empty">
            <Info size={18} />
            <span>No subdomains found.</span>
          </div>
        )}

        <ManagementFeedback error={error} txState={txState} />
      </div>
    </section>
  )
}

export type { SubdomainsViewProps } from './subdomains/types'
