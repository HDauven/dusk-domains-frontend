import { useEffect } from 'react'
import { updatePageMetadata } from '../app/pageMetadata'
import { Markdown } from './Markdown'
import terms from './terms.md?raw'
import privacy from './privacy.md?raw'
import './styles.css'

const pages = {
  terms: {
    title: 'Terms of Use',
    description: 'Terms governing the use of the Dusk Domains website, public API, software and documentation.',
    source: terms,
  },
  privacy: {
    title: 'Privacy Notice',
    description: 'How Dusk Domains processes personal data, uses browser storage and handles privacy requests.',
    source: privacy,
  },
}

export function LegalPage({ page }: { page: keyof typeof pages }) {
  const { title, description, source } = pages[page]
  useEffect(() => {
    updatePageMetadata({ title: `${title} · Dusk Domains`, description, url: `https://dusk.domains/${page}` })
    return () => updatePageMetadata()
  }, [page, title, description])
  return <article className="legal-page"><Markdown source={source} /></article>
}
