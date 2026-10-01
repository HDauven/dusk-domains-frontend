import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { ActivityHistoryView } from './ActivityHistoryView'

it('places primary addresses inside collapsed Details, including grouped events', () => {
  const primary = { id: 'primary', eventType: 'primary_name' as const, node: 'node', name: 'alpha.dusk', actor: 'me',
    target: 'moonlight_address:address', timestamp: '', blockHeight: 1, txId: 'tx' }
  for (const grouped of [false, true]) {
    const events = grouped ? [primary, { ...primary, id: 'registration', eventType: 'registration' as const, target: 'me' }] : [primary]
    const html = renderToStaticMarkup(<ActivityHistoryView activityEntries={events} currentBlockHeight={1} displayName="alpha.dusk"
      formatActivityTime={value => value} loading={false} recentWarnings={[]} viewerAuthority="me" />)
    const details = html.match(/<details>(.*?)<\/details>/)?.[1]
    expect(details).toContain('Dusk address: address')
    expect(html.replace(/<details>.*?<\/details>/g, '')).not.toContain('address')
    expect(html).not.toContain('Shown for')
    expect(html).not.toContain('<details open')
  }
})
