import type { WalletConnectionStatus } from '../wallet/walletStatus'
import { RegistrationAddressField } from './setup/RegistrationAddressField'
import { RegistrationWalletSetupCard } from './setup/RegistrationWalletSetupCard'

export function RegistrationSetupStep({
  canRegister,
  displayName,
  installUrl,
  onAddressInputChange,
  onOpenWalletConnection,
  onRefreshWalletProviders,
  onRegisterSetsPrimaryChange,
  onUseWalletAddress,
  registerSetsPrimary,
  registrationAddressInput,
  registrationTargetAddressErrors,
  selectedAddress,
  walletDiscoveryRefreshing,
  walletSetupState,
}: {
  canRegister: boolean
  displayName: string
  installUrl: string
  onAddressInputChange: (value: string) => void
  onOpenWalletConnection: () => void
  onRefreshWalletProviders: () => void
  onRegisterSetsPrimaryChange: (checked: boolean) => void
  onUseWalletAddress: () => void
  registerSetsPrimary: boolean
  registrationAddressInput: string
  registrationTargetAddressErrors: string[]
  selectedAddress: string
  walletDiscoveryRefreshing: boolean
  walletSetupState: WalletConnectionStatus
}) {
  return (
    <div className="registration-setup" aria-label="Registration setup">
      <RegistrationWalletSetupCard
        installUrl={installUrl}
        onOpenWalletConnection={onOpenWalletConnection}
        onRefreshWalletProviders={onRefreshWalletProviders}
        selectedAddress={selectedAddress}
        walletDiscoveryRefreshing={walletDiscoveryRefreshing}
        walletSetupState={walletSetupState}
      />
      <label className="setup-toggle">
        <input
          checked={Boolean(selectedAddress && registerSetsPrimary)}
          disabled={!canRegister || !selectedAddress}
          type="checkbox"
          onChange={(event) => onRegisterSetsPrimaryChange(event.target.checked)}
        />
        <span>
          <strong>Set as primary domain</strong>
          <em>{selectedAddress ? registerSetsPrimary ? `Show ${displayName} for this wallet.` : 'Skip for now. You can set it later.' : 'Available after wallet connection.'}</em>
        </span>
      </label>
      {selectedAddress && !registerSetsPrimary ? (
        <RegistrationAddressField
          onAddressInputChange={onAddressInputChange}
          onUseWalletAddress={onUseWalletAddress}
          registrationAddressInput={registrationAddressInput}
          registrationTargetAddressErrors={registrationTargetAddressErrors}
          selectedAddress={selectedAddress}
        />
      ) : null}
    </div>
  )
}
