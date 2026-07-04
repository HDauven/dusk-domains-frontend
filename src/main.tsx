import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installLocalDevDuskWallet } from './names/internal'

const env = import.meta.env
const domainsEnv = (key: string) => env[`VITE_DUSK_DOMAINS_${key}`] ?? env[`VITE_DUSK_NAMES_${key}`]

if (env.DEV && domainsEnv('ENABLE_LOCAL_DEV_WALLET') === 'true') {
  installLocalDevDuskWallet({
    account: domainsEnv('LOCAL_DEV_ACCOUNT'),
    chainId: domainsEnv('LOCAL_DEV_CHAIN_ID') ?? domainsEnv('CHAIN_ID'),
    nodeUrl: domainsEnv('NODE_URL'),
    writeBridgeUrl: domainsEnv('LOCAL_DEV_WRITE_BRIDGE_URL'),
    publicBalanceLux: domainsEnv('LOCAL_DEV_BALANCE_LUX'),
    rejectProfileRequest: domainsEnv('LOCAL_DEV_REJECT_PROFILES') === 'true',
    autoLockDelayMs: Number(domainsEnv('LOCAL_DEV_AUTO_LOCK_MS') ?? 0),
    profileRequestDelayMs: Number(domainsEnv('LOCAL_DEV_PROFILE_DELAY_MS') ?? 0),
    startLocked: domainsEnv('LOCAL_DEV_START_LOCKED') === 'true',
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
