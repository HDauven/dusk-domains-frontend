import { WebsiteVerificationPanel } from './settings/WebsiteVerificationPanel'
import { Panel } from '../../components/ui/Panel'
import { PanelHeader } from '../../components/ui/PanelHeader'
import { isSubname } from './domainFormat'
import { RecipientSettingsPanel } from './settings/RecipientSettingsPanel'
import { RenewalPanel } from './settings/RenewalPanel'
import { SubnameExpiryPanel } from './settings/SubnameExpiryPanel'
import type { DomainSettingsViewProps } from './settings/types'

export function DomainSettingsView({ isOwner = true, displayName, managedName, ownership, renewal, clock, websiteVerification }: DomainSettingsViewProps) {
  return (
    <Panel className="management-panel" id="my-names" aria-labelledby="management-heading">
      <PanelHeader
        headingId="management-heading"
        subtitle={`Who owns ${displayName}, who manages it, and how long it lasts.`}
        title="Settings"
      />

      {isOwner ? <RecipientSettingsPanel displayName={displayName} managedName={managedName} ownership={ownership} /> : null}

      {isOwner ? <WebsiteVerificationPanel name={displayName} owner={managedName.owner} website="" {...websiteVerification} /> : null}

      {isSubname(displayName) ? (
        <SubnameExpiryPanel displayName={displayName} managedName={managedName} clock={clock} />
      ) : (
        <>
          {/* Anyone can renew a listed name before its grace ends; the order keeps its own terms. */}
          {managedName.inMarketplaceEscrow ? <p className="renewal-listing-note">This name is listed in the market. Renewing it doesn’t change the listing: the name stays listed at the same price, until the same end date.</p> : null}
          <RenewalPanel managedName={managedName} renewal={renewal} clock={clock} />
        </>
      )}
    </Panel>
  )
}

export type { DomainSettingsViewProps, ManagedNameState } from './settings/types'
