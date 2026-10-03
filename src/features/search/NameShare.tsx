import { useEffect } from 'react'
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
  const copyLink = async () => {
    setFeedback('')
    try {
      await navigator.clipboard.writeText(link)
      setFeedback('Copied')
    } catch {
      setFeedback('Copy failed. Copy the link below.')
    }
  }
  return <div className="name-share">
    <Button variant="quiet" disabled={Boolean(referralAddress && referrer === null)} onClick={() => void copyLink()}>Share</Button>
    <Button variant="quiet" onClick={() => {
      setFeedback('')
      void downloadNameCard(name).catch(() => setFeedback('Could not download the card. Try again.'))
    }}>Download card</Button>
    {feedback ? <span role="status">{feedback}</span> : null}
    {feedback.startsWith('Copy failed') ? <a href={link}>{link}</a> : null}
  </div>
}
