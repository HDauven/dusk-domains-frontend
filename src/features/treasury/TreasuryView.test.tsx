import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { TreasuryView } from './TreasuryView'
import { emptyTreasuryUiState } from './treasuryState'
import { DEFAULT_FEE_CONFIG } from '../../names/internal'
import { feeConfigFormFromConfig } from './feeConfig'
import type { TreasuryViewProps } from './treasuryViewTypes'

it('shows visitors a read-only summary and the operator their actions', () => {
  const props = {
      treasuryState: emptyTreasuryUiState(),
      claim: {},
      pricing: { feeConfig: DEFAULT_FEE_CONFIG, feeConfigForm: feeConfigFormFromConfig(DEFAULT_FEE_CONFIG) },
      wallet: { connectedAsTreasuryOperator: false },
    } as TreasuryViewProps
    const visitor = renderToStaticMarkup(<TreasuryView {...props} />)
    expect(visitor).toContain('Yearly prices')
    expect(visitor).toContain('Registrations')
    expect(visitor).not.toContain('<input')
    expect(visitor).not.toContain('Update pricing')
    expect(visitor).not.toContain('Refresh')
    const operator = renderToStaticMarkup(<TreasuryView {...props} wallet={{ ...props.wallet, connectedAsTreasuryOperator: true }} />)
    expect(operator).toContain('Update pricing')
    expect(operator).toContain('<input')
  })

it('shows one retryable error instead of zero balances or default prices before the first read', () => {
  const html = renderToStaticMarkup(<TreasuryView {...{
    treasuryLoaded: false, treasuryError: 'Treasury data is unavailable right now.', onRetry: () => {},
    treasuryState: emptyTreasuryUiState(), claim: {},
    pricing: { feeConfig: DEFAULT_FEE_CONFIG, feeConfigLoaded: false, feeConfigError: 'Live pricing is unavailable.' },
    wallet: {},
  } as TreasuryViewProps} />)
  expect(html).toContain('Retry')
  expect(html.match(/role="alert"/g)).toHaveLength(1)
  expect(html).not.toContain('DUSK')
  expect(html).not.toContain('Registrations')
})

it('shows only one refresh notice for an operator when both treasury and pricing reads fail', () => {
  const html = renderToStaticMarkup(<TreasuryView {...{
    treasuryLoaded: true, treasuryError: "Couldn't refresh. Retrying…", treasuryState: emptyTreasuryUiState(), claim: {},
    pricing: { feeConfig: DEFAULT_FEE_CONFIG, feeConfigLoaded: true, feeConfigForm: feeConfigFormFromConfig(DEFAULT_FEE_CONFIG), feeConfigError: "Couldn't refresh. Retrying…" },
    wallet: { connectedAsTreasuryOperator: true },
  } as TreasuryViewProps} />)
  expect(html.match(/Retrying…/g)).toHaveLength(1)
})
