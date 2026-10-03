import { Panel } from '../../components/ui/Panel'
import { canRenewOutsideEscrow } from '../../app/managedNameState'
import { PanelHeader } from '../../components/ui/PanelHeader'
import { isSubname } from './domainFormat'
import { RecipientSettingsPanel } from './settings/RecipientSettingsPanel'
import { RenewalPanel } from './settings/RenewalPanel'
import { SubnameExpiryPanel } from './settings/SubnameExpiryPanel'
import type { DomainSettingsViewProps } from './settings/types'

export function DomainSettingsView({ isOwner = true, displayName, managedName, ownership, renewal, clock }: DomainSettingsViewProps) {
  return (
    <Panel className="management-panel" id="my-names" aria-labelledby="management-heading">
      <PanelHeader
        headingId="management-heading"
        subtitle={`Who owns ${displayName}, who manages it, and how long it lasts.`}
        title="Settings"
      />

      {isOwner ? <RecipientSettingsPanel displayName={displayName} managedName={managedName} ownership={ownership} /> : null}

      {isSubname(displayName) ? (
        <SubnameExpiryPanel displayName={displayName} managedName={managedName} clock={clock} />
      ) : managedName.inMarketplaceEscrow ? (
        <p>Renewal is available after the listing closes.</p>
      ) : !canRenewOutsideEscrow(managedName) ? (
        <p>Renewal is unavailable until marketplace custody can be checked.</p>
      ) : (
        <RenewalPanel managedName={managedName} renewal={renewal} clock={clock} />
      )}
    </Panel>
  )
}

export type { DomainSettingsViewProps, ManagedNameState } from './settings/types'
