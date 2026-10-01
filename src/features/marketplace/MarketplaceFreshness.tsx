import { useContext } from 'react'
import { NetworkFreshnessContext } from '../../app/networkFreshness'

export function MarketplaceFreshness({ updatedAt }: { updatedAt?: number | null }) {
  const networkNotice = useContext(NetworkFreshnessContext)
  return updatedAt && !networkNotice ? <p className="marketplace-freshness">Updated <time dateTime={new Date(updatedAt).toISOString()}>{new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></p> : null
}
