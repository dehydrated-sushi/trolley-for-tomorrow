import HeroSection from './HeroSection'
import LiveDemo from './LiveDemo'
import FrozenFeatures from './FrozenFeatures'

export default function HomePage() {
  return (
    <main className="pt-16">
      <HeroSection />
      <LiveDemo />
      <FrozenFeatures />
    </main>
  )
}