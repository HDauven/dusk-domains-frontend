import {
  contractPrincipalFromWalletAccount,
} from '../names/internal'

export function contractPrincipalInput(value: string, label: string) {
  const result = contractPrincipalFromWalletAccount(value)
  if (result.ok) {
    if (result.principal === `0x01${'00'.repeat(31)}`)
      throw new Error(`${label} cannot be the Dusk transfer contract. Enter a public Dusk address or another contract.`)
    return result.principal
  }
  throw new Error(`${label} must be a Dusk public account or contract:0x... ${result.reason}`)
}
