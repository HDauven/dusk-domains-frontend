import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { TreasuryView } from './TreasuryView'
import { emptyTreasuryUiState } from './treasuryState'
import { DEFAULT_FEE_CONFIG } from '../../names/internal'
import { feeConfigFormFromConfig } from './feeConfig'
import type { TreasuryViewProps } from './treasuryViewTypes'

it('shows visitors a read-only summary and the operator their actions', () => {
  const props = {treasuryState:emptyTreasuryUiState(),feeConfig:DEFAULT_FEE_CONFIG,feeConfigForm:feeConfigFormFromConfig(DEFAULT_FEE_CONFIG),connectedAsTreasuryOperator:false} as TreasuryViewProps
  const visitor = renderToStaticMarkup(<TreasuryView {...props} />)
  expect(visitor).toContain('Yearly prices')
  expect(visitor).toContain('Registrations')
  expect(visitor).not.toContain('<input')
  expect(visitor).not.toContain('Update pricing')
  expect(visitor).not.toContain('Refresh')
  const operator = renderToStaticMarkup(<TreasuryView {...props} connectedAsTreasuryOperator />)
  expect(operator).toContain('Update pricing')
  expect(operator).toContain('<input')
})
