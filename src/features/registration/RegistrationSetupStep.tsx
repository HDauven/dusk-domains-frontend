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
  onRefreshWalletProviders: () => Promise<unknown> | void
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
    <div className="register-step" aria-label="Owner">
      <RegistrationWalletSetupCard
        installUrl={installUrl}
        onOpenWalletConnection={onOpenWalletConnection}
        onRefreshWalletProviders={onRefreshWalletProviders}
        selectedAddress={selectedAddress}
        walletDiscoveryRefreshing={walletDiscoveryRefreshing}
        walletSetupState={walletSetupState}
      />
      <label className="register-toggle">
        <span>
          <strong>Make it my primary name</strong>
          <em>{selectedAddress ? registerSetsPrimary ? `Apps show ${displayName} instead of this wallet's address.` : 'Not now. You can set it any time.' : 'Available once a wallet is connected.'}</em>
        </span>
        <input
          checked={Boolean(selectedAddress && registerSetsPrimary)}
          disabled={!canRegister || !selectedAddress}
          role="switch"
          type="checkbox"
          onChange={(event) => onRegisterSetsPrimaryChange(event.target.checked)}
        />
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
