import {
  contractPrincipalFromWalletAccount,
} from '../names/internal'

export function contractPrincipalInput(value: string, label: string) {
  const result = contractPrincipalFromWalletAccount(value)
  if (result.ok) return result.principal
  throw new Error(`${label} must be a Dusk public account or contract:0x... ${result.reason}`)
}
