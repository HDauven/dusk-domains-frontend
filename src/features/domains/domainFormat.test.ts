import { describe, expect, it } from 'vitest'
import { overviewCopyForIssues, policyIssueCopy } from './domainFormat'

describe('domain policy copy', () => {
  it('explains that 1-2 character domains cannot be registered', () => {
    const text = 'Labels shorter than 3 characters are reserved.'
    const expected = 'Dusk Domains start at 3 characters. 1-2 character domains are reserved.'

    expect(policyIssueCopy(text)).toBe(expected)
    expect(overviewCopyForIssues('invalid', [{ tone: 'danger', text }])).toBe(expected)
  })
})
