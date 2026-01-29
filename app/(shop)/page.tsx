import HeroSection from '@/components/sections/HeroSection'
import MostPopular from '@/components/sections/MostPopular'
import PromoBanner from '@/components/sections/PromoBanner'
import ScriptCategories from '@/components/sections/ScriptCategories'
import Connectivity from '@/components/sections/Connectivity'

export default function Home() {
  return (
    <main className="max-w-container mx-auto px-8 lg:px-12 py-8">
      <HeroSection />
      <MostPopular />
      <PromoBanner />
      <ScriptCategories />
      <Connectivity />
    </main>
  )
}
