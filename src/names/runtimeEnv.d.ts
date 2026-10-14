/** An env value as the site reads it: a string, trimmed. */
export function runtimeEnvValue(env: Record<string, unknown>, key: string): string
/** The chain the site runs on: dusk:0 to dusk:3, and testnet's dusk:2 for anything else. */
export function runtimeChainId(env: Record<string, unknown>): string
/** Mainnet (dusk:1) and testnet (dusk:2), which follow governance through a deployed manifest. */
export function isProductionChain(chainId: string): boolean
