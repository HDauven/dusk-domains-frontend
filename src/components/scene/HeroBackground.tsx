import { HeroStarField } from './HeroStarField'
import { PlanetHorizon } from './PlanetHorizon'

export function HeroBackground() {
  return (
    <div className="scene-background" aria-hidden="true">
      <div className="hero-ambience" />
      <HeroStarField />
      <PlanetHorizon />
    </div>
  )
}
