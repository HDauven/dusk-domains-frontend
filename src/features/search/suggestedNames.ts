export function suggestedNames(name: string) {
  const label = name.replace(/\.dusk$/i, '').split('.')[0].slice(0, 55)
  return [`${label}hq.dusk`, `my${label}.dusk`, `${label}1.dusk`]
}
