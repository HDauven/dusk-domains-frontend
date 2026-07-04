import { AlertTriangle, Info } from 'lucide-react'
import type { RuntimeNotice as RuntimeNoticeState } from './AppTypes'

export function RuntimeNotice({ notice }: { notice: RuntimeNoticeState }) {
  return (
    <div className={notice.tone === 'danger' ? 'runtime-notice danger' : 'runtime-notice'} aria-live="polite">
      {notice.tone === 'danger' ? <AlertTriangle size={17} /> : <Info size={17} />}
      <span>{notice.message}</span>
    </div>
  )
}
