import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { useDuskDomainsAppModel } from './useDuskDomainsAppModel'
import { useDuskDomainWriter } from './useDuskDomainWriter'
import { createWriteAccess } from './writeAccess'
import { unpaused } from './operatorPause'
import { createDuskDomainsRuntimeConfig, submitDuskDomainWrite } from '../names/internal'

vi.mock('../names/internal', async original => ({ ...await original<typeof import('../names/internal')>(), submitDuskDomainWrite: vi.fn() }))
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

const env = {
  VITE_DUSK_DOMAINS_ROUTER_CONTRACT_ID: `0x${'78'.repeat(32)}`,
  VITE_DUSK_DOMAINS_CORE_CONTRACT_ID: `0x${'77'.repeat(32)}`,
  VITE_DUSK_DOMAINS_TREASURY_CONTRACT_ID: `0x${'66'.repeat(32)}`,
  VITE_DUSK_DOMAINS_ENABLE_LIVE_WRITES: 'true',
  VITE_DUSK_DOMAINS_INDEXER_URL: '',
}

it('keeps the shell and registration read only with valid contracts but no indexer', () => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
  let model!: ReturnType<typeof useDuskDomainsAppModel>
  function Probe() { model = useDuskDomainsAppModel(); return null }
  renderToStaticMarkup(<Probe />)
  expect(model.shellProps.network.tone).toBe('preview')
  expect(model.mainContentProps.searchProps.overviewProps).toMatchObject({ readOnly: true, registrationUnavailable: true })
  expect(model.shellProps.networkStatus.readOnly).toBe(true)
})

it('rejects preview submissions even when a transaction-capable app exists', async () => {
  vi.mocked(submitDuskDomainWrite).mockResolvedValue({status:'executed'} as never)
  const config = createDuskDomainsRuntimeConfig(env)
  expect(config.mode).toBe('preview')
  const app = {} as never
  let submit!: ReturnType<typeof useDuskDomainWriter>
  function Probe() {
    submit = useDuskDomainWriter({ contracts: config.contracts, liveDuskDomainsApp: app, writeAccess: createWriteAccess(config, app, unpaused) })
    return null
  }
  renderToStaticMarkup(<Probe />)
  await expect(submit('example.dusk', {contract:'core',functionName:'commit_runtime'} as never)).rejects.toThrow('read only')
  expect(submitDuskDomainWrite).not.toHaveBeenCalled()
})

it('uses the same action pause for registration eligibility and the writer', () => {
  const access = createWriteAccess({mode:'live_ready',liveWritesEnabled:true}, {} as never, {...unpaused,registrationsPaused:true})
  expect(access.readOnly).toBe(false)
  expect(access.canRegister).toBe(false)
  expect(access.reason({contract:'core',functionName:'complete_registration_runtime'})).toContain('paused')
  expect(access.reason({contract:'marketplace',functionName:'claim_refund_runtime'})).toBeNull()
})
