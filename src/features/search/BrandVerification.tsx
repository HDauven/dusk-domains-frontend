import { Badge } from '../../components/ui/Badge'
import type { NameVerification } from '../../names/verification'
import { watchedBrand } from './watchedBrand'

export function BrandVerification({ name, verification, explain = false }: { name: string, verification?: NameVerification | null, explain?: boolean }) {
  const brand = watchedBrand(name)
  if (!brand || verification?.status === 'verified') return null
  const explanation = `Not verified by ${brand}. Check before trusting it.`
  // Name pages show the explanation as text; compact cards keep it in the label and hover title.
  if (explain) return <span className="brand-unverified"><Badge>Unverified</Badge> <span className="field-note">{explanation}</span></span>
  return <Badge title={explanation} aria-label={`Unverified. ${explanation}`}>Unverified</Badge>
}
