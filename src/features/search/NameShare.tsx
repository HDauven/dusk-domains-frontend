import { useEffect, useId } from 'react'
import { Button } from '../../components/ui/Button'
import { useScopedState } from '../../utils/useScopedState'
import { referralStateFromInput } from '../referrals/referralState'
import { downloadNameCard } from '../registration/shareNameCard'
import { canonicalNameLink } from './namePageMetadata'

export function NameShare({ name, referralAddress = '' }: { name: string; referralAddress?: string }) {
  const [referrer, setReferrer] = useScopedState<string | null>(referralAddress, null)
  const [feedback, setFeedback] = useScopedState(`${name}:${referralAddress}`, '')
  useEffect(() => {
    let current = true
    void referralStateFromInput(referralAddress).then(state => {
      if (current) setReferrer(state.valid ? state.input : '')
    }).catch(() => { if (current) setReferrer('') })
    return () => { current = false }
  }, [referralAddress, setReferrer])
  const link = canonicalNameLink(name, referrer ?? '')
  // The app shares the connected wallet's Dusk address; a contract referrer is its contract ID.
  const sharedReferral = referrer ? referrer.startsWith('contract:') ? 'your contract ID' : 'your Dusk address' : ''
  const noteId = useId()
  const copyLink = async () => {
    setFeedback('')
    try {
      await navigator.clipboard.writeText(link)
      setFeedback(sharedReferral ? `Copied. The link includes ${sharedReferral} as a referral.` : 'Copied')
    } catch {
      setFeedback('Copy failed. Copy the link below.')
    }
  }
  return <div className="name-share">
    <Button variant="quiet" disabled={Boolean(referralAddress && referrer === null)} aria-describedby={sharedReferral && !feedback ? noteId : undefined} onClick={() => void copyLink()}>Share</Button>
    <Button variant="quiet" onClick={() => {
      setFeedback('')
      void downloadNameCard(name).catch(() => setFeedback('Could not download the card. Try again.'))
    }}>Download card</Button>
    {!feedback && sharedReferral ? <span id={noteId} className="name-share-note">Share adds {sharedReferral} to the link as a referral.</span> : null}
    {/* Always present, so screen readers announce the message that lands in it. */}
    <span role="status" className="name-share-status">{feedback}</span>
    {feedback.startsWith('Copy failed') ? <a href={link}>{link}</a> : null}
  </div>
}
