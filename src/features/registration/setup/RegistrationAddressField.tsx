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
      label="Points to"
      labelFor="registration-address"
    >
      <div className="registration-address-input-row">
        <input
          id="registration-address"
          value={registrationAddressInput}
          onChange={(event) => onAddressInputChange(event.target.value)}
          placeholder={selectedAddress}
        />
        <button className="commit-button" type="button" onClick={onUseWalletAddress}>
          Use my wallet
        </button>
      </div>
      <FieldHelp>Payments to this name go to this address. You can change it later.</FieldHelp>
      {registrationTargetAddressErrors.length ? (
        <p className="field-note danger">{registrationTargetAddressErrors[0]}</p>
      ) : null}
    </FieldShell>
  )
}
