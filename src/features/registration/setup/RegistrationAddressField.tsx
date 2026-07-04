import { FieldHelp, FieldShell } from '../../../components/ui/FormControls'

export function RegistrationAddressField({
  onAddressInputChange,
  onUseWalletAddress,
  registrationAddressInput,
  registrationTargetAddressErrors,
  selectedAddress,
}: {
  onAddressInputChange: (value: string) => void
  onUseWalletAddress: () => void
  registrationAddressInput: string
  registrationTargetAddressErrors: string[]
  selectedAddress: string
}) {
  return (
    <FieldShell
      className="registration-address-field"
      label="Address"
      labelFor="registration-address"
    >
      <div className="registration-address-input-row">
        <input
          id="registration-address"
          value={registrationAddressInput}
          onChange={(event) => onAddressInputChange(event.target.value)}
          placeholder={selectedAddress}
        />
        <button
          className="commit-button"
          type="button"
          onClick={onUseWalletAddress}
        >
          Use wallet
        </button>
      </div>
      <FieldHelp>This domain will resolve to this address. You can change the address or set a primary domain later.</FieldHelp>
      {registrationTargetAddressErrors.length ? (
        <p className="field-note danger">{registrationTargetAddressErrors[0]}</p>
      ) : null}
    </FieldShell>
  )
}
