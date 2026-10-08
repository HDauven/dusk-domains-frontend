import { Button } from '../ui/Button'

export function ReadNotice({ error, hasData, onRetry }: { error: string; hasData: boolean; onRetry?: () => void }) {
  return <div className="search-status" role={hasData ? 'status' : 'alert'}>
    <p>{error}</p>
    {!hasData && onRetry ? <Button onClick={onRetry}>Retry</Button> : null}
  </div>
}
