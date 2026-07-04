import { AlertTriangle, Info } from 'lucide-react'
import type { NameResult } from '../../names/internal'
import { policyIssueCopy } from '../domains/domainFormat'

export function RegistrationPolicyNotes({
  issues,
}: {
  issues: NameResult['issues']
}) {
  if (!issues.length) return null

  return (
    <div className="policy-notes" aria-label="Policy notes">
      {issues.map((issue) => (
        <p className={issue.tone} key={issue.text}>
          {issue.tone === 'danger' ? <AlertTriangle size={16} /> : <Info size={16} />}
          {policyIssueCopy(issue.text)}
        </p>
      ))}
    </div>
  )
}
