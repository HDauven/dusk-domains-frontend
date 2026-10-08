import { watchedBrand } from './watchedBrand'

export function BrandClaimNotice({ name }: { name: string }) {
  if (!watchedBrand(name)) return null
  return <p className="field-note brand-claim-notice">{name} matches a well-known brand. It will show as unverified unless its owner proves it with their website, and impersonating a brand may be illegal.</p>
}
