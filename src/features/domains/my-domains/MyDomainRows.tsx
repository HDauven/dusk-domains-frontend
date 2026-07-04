import { abbreviate } from '../../../utils/format'
import type { MyDomainRowsProps } from './types'

export function MyDomainRows({
  formatNameLifecycle,
  myNames,
  onOpenIndexedName,
  primarySummaries,
}: MyDomainRowsProps) {
  return (
    <div className="my-names-list">
      {myNames.map((name) => {
        const moonlight = name.records.find((record) => record.key === 'moonlight_address')
        const primarySummary = primarySummaries[name.node] ?? {
          label: moonlight ? 'Checking' : 'No address',
          tone: 'muted' as const,
        }
        return (
          <article className="my-name-row" key={name.node}>
            <div>
              <strong>{name.canonicalName}</strong>
              <span>{formatNameLifecycle(name)}</span>
            </div>
            <div>
              <span>Address</span>
              <code>{moonlight ? abbreviate(moonlight.value) : 'Not set'}</code>
            </div>
            <div>
              <span>Primary</span>
              <strong className={`my-name-primary ${primarySummary.tone}`}>{primarySummary.label}</strong>
            </div>
            <div>
              <span>Subdomains</span>
              <strong>{name.subnameCount}</strong>
            </div>
            <button className="commit-button save-record" type="button" onClick={() => void onOpenIndexedName(name.canonicalName)}>
              Open
            </button>
          </article>
        )
      })}
    </div>
  )
}
