// What the Dusk Domains team can and cannot do to a registered name, as the Terms state it.
// Keep the Terms of Use (section 5) word for word in step with NAME_CONTROL_TERMS. A name's
// manager can change its records and subnames without the owner, so no sentence here says that
// only the owner's wallet controls a name unless the owner is also its manager.

export const NAME_CONTROL_TERMS = 'Once a name is registered, only its owner and its manager control it, and they are usually the same wallet. A manager can change the name\'s records and subnames but can\'t transfer it. We can\'t take a name, change its records or move anyone else\'s funds on chain. Our website and API may hide abusive names from display. A name stays its owner\'s while they keep renewing it.'

/** The Terms sentence, said by the site rather than by "we", with the exceptions that apply to some names. */
export const NAME_CONTROL_SUMMARY = `${NAME_CONTROL_TERMS.replace('We can\'t', 'The Dusk Domains team can\'t')} A subname is the exception: the owner or manager of a name above it can take it back. While a name is listed, the market contract holds it until it sells, is returned or its grace period ends.`

/** The same facts, said to the owner of a registered (root) name, and whether another wallet manages it. */
export function nameControlCopy(name: string, separateManager = false) {
  const control = separateManager
    ? `You own ${name} and another wallet manages it. That wallet can change its records and subnames but can't transfer it.`
    : `Only your wallet controls ${name}. If you make another wallet its manager, that wallet can change its records and subnames but can't transfer it.`
  return `${control} The Dusk Domains team can't take it, change its records or move your funds on chain. Our website and API may hide abusive names from display. It stays yours while you keep renewing it.`
}

/** On every subname's page, for whoever reads it. Any active ancestor's owner or manager can
 * reassign, take back or remove a subname, at any depth, and its holder has no way to opt out. */
export function subnameControlCopy({ parent, deeper, holder, expiresWithParent }: {
  /** The name directly above it. */
  parent: string
  /** Names further up can do the same. */
  deeper: boolean
  /** The reader holds this subname and holds no name above it. */
  holder: boolean
  expiresWithParent: boolean
}) {
  const rule = `The owner or manager of ${parent}${deeper ? ' or a name above it' : ''} can take this name back, give it to another wallet or remove it`
  const consent = holder ? '. You can\'t prevent this.' : ', and its holder can\'t prevent this.'
  return `${rule}${consent} It expires ${expiresWithParent ? 'with' : 'no later than'} ${parent}.`
}
