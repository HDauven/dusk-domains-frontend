// @vitest-environment happy-dom
import { act, useLayoutEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { editableRecordKeys } from '../../app/appConstants'
import { useDomainManagementFeature } from './useDomainManagementFeature'
import { useDomainRecordState } from './useDomainRecordState'
import { RecordsView } from './RecordsView'

let root: Root
let records: ReturnType<typeof useDomainRecordState>
let feature: ReturnType<typeof useDomainManagementFeature>
let requestAddress: ReturnType<typeof vi.fn<() => Promise<string>>>
let visit: object
let session: object
const setRecordError = vi.fn()
const setRecordTxState = vi.fn()
const submitNameWrite = Object.assign(vi.fn(), {
  captureWorkspace: () => { const captured = visit; return () => captured === visit },
  captureSession: () => { const captured = session; return () => captured === session },
})

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root')!)
  requestAddress = vi.fn()
  visit = {}; session = {}
  setRecordError.mockClear()
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals() })

function Probe({ name = 'alpha.dusk', view = 'manage' }) {
  const state = useDomainRecordState({ displayName: name, nodeHex: name, editableRecordKeys })
  const current = useDomainManagementFeature({
    appRuntime: {}, activityFeed: {}, derivedState: { canRemoveRecords: true, canSaveRecords: true }, economicsRuntime: {}, searchRuntime: {},
    searchState: { mainView: 'search', resultView: view },
    namePreview: { displayName: name, nodeHex: name, result: {}, renewalPreviewLifecycle: {} },
    domainState: { setRecordError, setRecordTxState, managedName: {} }, domainRecordState: state,
    walletRuntime: { selectedAddress: 'A', walletSession: {}, walletState: {}, requestSelectedShieldedAddress: requestAddress, submitNameWrite },
  } as never)
  useLayoutEffect(() => { records = state; feature = current })
  return view === 'manage' ? <RecordsView {...current.recordsProps} /> : null
}

it.each(['cancel', 'editor switch', 'name', 'leave records', 'navigate away and back', 'session', 'manual edit', 'reset'])(
  'discards delayed wallet addresses after %s', async change => {
    const response = deferred<string>()
    requestAddress.mockReturnValue(response.promise)
    await act(async () => root.render(<Probe />))
    let pending!: Promise<void>
    await act(async () => { pending = feature.recordsProps.wallet.onUseWalletShieldedAddress() })
    await act(async () => {
      if (change === 'cancel' || change === 'editor switch') feature.recordsProps.draft.onDiscardDrafts()
      if (change === 'name') root.render(<Probe name="beta.dusk" />)
      if (change === 'leave records') root.render(<Probe view="details" />)
      if (change === 'navigate away and back') { visit = {}; visit = {} }
      if (change === 'session') session = {}
      if (change === 'manual edit') feature.recordsProps.draft.onDraftValueChange('phoenix_payment_endpoint', 'manually chosen')
      if (change === 'reset') records.searchActions.reset()
    })
    await act(async () => { response.resolve('delayed address'); await pending })
    expect(records.recordDrafts).toEqual(change === 'manual edit' ? { phoenix_payment_endpoint: 'manually chosen' } : {})
  },
)

it('applies only the newest wallet address request and suppresses stale errors', async () => {
  const old = deferred<string>(), current = deferred<string>()
  requestAddress.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
  await act(async () => root.render(<Probe />))
  let first!: Promise<void>, second!: Promise<void>
  await act(async () => {
    first = feature.recordsProps.wallet.onUseWalletShieldedAddress()
    second = feature.recordsProps.wallet.onUseWalletShieldedAddress()
  })
  await act(async () => { current.resolve('current address'); await second })
  await act(async () => { old.reject(new Error('stale error')); await first })
  expect(records.recordDrafts).toEqual({ phoenix_payment_endpoint: 'current address' })
  expect(setRecordError).not.toHaveBeenCalledWith('stale error')
})

it('shows every pending record value in the final inline review', async () => {
  await act(async () => root.render(<Probe />))
  await act(async () => (document.querySelector('button') as HTMLButtonElement).click())
  await act(async () => records.setRecordDrafts({ moonlight_address: '244Sywxj7PuMHpcPxemaXLcrY5rPgztra6H9Vz8cU1Ro5v23SxKTfVqr2yS7NXAXE1iq59ndn4aMZmYxuzu3Te3e9fokQKTUkYvFxYg2P2E8EEg1gWUbs3AFL2aNx62HQd7r', phoenix_payment_endpoint: 'wallet-approved-shielded-endpoint-123456789', website: 'https://example.test' }))
  const review = document.querySelector('[aria-label="Record changes to save"]')
  expect(review?.textContent).toContain('244Sywxj7PuMHpcPxemaXLcrY5rPgztra6H9Vz8cU1Ro5v23SxKTfVqr2yS7NXAXE1iq59ndn4aMZmYxuzu3Te3e9fokQKTUkYvFxYg2P2E8EEg1gWUbs3AFL2aNx62HQd7r')
  expect(review?.textContent).toContain('wallet-approved-shielded-endpoint-123456789')
  expect(review?.textContent).toContain('https://example.test')
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}
