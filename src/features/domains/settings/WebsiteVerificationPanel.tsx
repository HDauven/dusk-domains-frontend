import { useEffect, useLayoutEffect, useRef } from 'react'
import { useScopedState } from '../../../utils/useScopedState'
import { Button } from '../../../components/ui/Button'
import { CopyValue } from '../../../components/ui/CopyValue'
import { WebsiteBadge } from '../../../components/ui/WebsiteBadge'
import { websiteDomain, type WebsiteVerification } from '../../../names/http/verification'

export type WebsiteVerificationPanelProps = {
  name: string
  owner: string
  website: string
  verification?: WebsiteVerification
  onCheck?: () => Promise<void>
  onRefresh?: () => Promise<unknown>
}

export function WebsiteVerificationPanel({ name, owner, website, verification, onCheck, onRefresh }: WebsiteVerificationPanelProps) {
  const domain = websiteDomain(website)
  const scope = JSON.stringify([name, owner, website])
  const [state, setState] = useScopedState<{ checking?: boolean; timedOut?: boolean; error?: string }>(scope, {})
  const checking = !state.timedOut && (state.checking || verification?.status === 'checking')
  const request = useRef(0)
  const refresh = useRef(onRefresh)
  useLayoutEffect(() => { refresh.current = onRefresh }, [onRefresh])
  useEffect(() => {
    if (!checking) return
    let refreshing = false
    const poll = setInterval(() => {
      if (refreshing || !refresh.current) return
      refreshing = true
      void refresh.current().catch(() => {}).finally(() => { refreshing = false })
    }, 5000)
    const timeout = setTimeout(() => {
      request.current++
      clearInterval(poll)
      setState({ timedOut: true, error: 'Checking took too long. Try again.' })
    }, 60_000)
    return () => { clearInterval(poll); clearTimeout(timeout) }
  }, [checking, scope, setState])
  const value = `dusk-domains-verification=${name};owner=${owner}`
  const status = checking ? 'Checking…' : verification?.status === 'verified' ? null
    : verification?.status === 'mismatch' ? 'Doesn’t match — check the name and owner in your TXT record.'
      : verification?.status === 'retry' ? 'Could not check DNS. Try again in a moment.'
        : 'Not found — add the TXT record, then check again.'
  return <section className="renewal-box website-verification" aria-label="Verify your website">
    <h3>Verify your website</h3>
    <p>Add this DNS TXT record at your website’s DNS provider to link the domain to this name and its current owner. The badge confirms control of the website domain and is rechecked periodically.</p>
    {!website ? <p role="status">Website record missing — add an HTTPS website in Records first.</p>
      : !domain ? <p role="status">Add a valid HTTPS website with a domain and no port in Records first.</p>
        : !owner ? <p role="status">Waiting for the current owner.</p> : <>
          <dl className="verification-record">
            <div><dt>Type</dt><dd>TXT</dd></div>
            <div><dt>Host</dt><dd><code>{`_dusk-domains.${domain}`}</code><CopyValue value={`_dusk-domains.${domain}`} label="TXT host" /></dd></div>
            <div><dt>Value</dt><dd><code>{value}</code><CopyValue value={value} label="TXT value" /></dd></div>
          </dl>
          <div role="status" aria-live="polite">{state.error || status || <WebsiteBadge verification={verification} />}</div>
          <div><Button disabled={!onCheck || checking} onClick={async () => {
            if (!onCheck) return
            const current = ++request.current
            setState({ checking: true })
            try {
              await onCheck()
              if (current === request.current) setState({})
            } catch (error) {
              if (current === request.current) setState({ error: error instanceof Error ? error.message : 'Could not check DNS. Try again.' })
            }
          }}>Check now</Button></div>
        </>}
  </section>
}
