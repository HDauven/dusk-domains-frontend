/** In Unicode mode, valid surrogate pairs are one code point outside this range. */
export function unicodeInputError(value: string, field: string): string | undefined {
  if (/[\uD800-\uDFFF]/u.test(value))
    return `${field} contains malformed Unicode. Remove or retype the invalid character.`
}
