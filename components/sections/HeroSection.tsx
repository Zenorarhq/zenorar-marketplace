import Image from 'next/image'
import Link from 'next/link'
import { recommendedProducts } from '@/lib/mock-data'
import RecommendedCard from '@/components/cards/RecommendedCard'

export default function HeroSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
      {/* Main Hero */}
      <div className="lg:col-span-2 relative rounded-2xl overflow-hidden bg-surface-dark border border-border-dark min-h-[440px] flex items-center">
        <Image
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9zmjTWwkSIvRt_r_zJS1pESJGySilOPv_BT2beUj4tLs8wRpIY4iW-nRJQd6OJ8IyrG8LJqg9QEkdv8fJxxqkZb3a4HFt31h8q2F8BZ_LANkp-OfbK4graOrsBsDt_4oxxO7ZJEVt4-OJfGKJHbHLxrqO1cHeksGSqsL_JhUaq-tsTCFwj0P98Zm3q6YSDwAFYy54t87GRKruTCmcWfOsij78_GYuyfu2OUsm_iReGEX1oCqxRIOveP0rQio4MOzBF7sB7e-m2OTF"
          alt="Cyber tech background"
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />

        <div className="relative z-10 px-12 max-w-lg">
          <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
            Power Your <br />
            <span className="text-primary">Digital World</span>
          </h1>
          <p className="text-slate-300 mb-8 text-lg">
            Access premium scripts, instant connectivity, and essential tools for the modern digital life.
          </p>

          <Link
            href="/products"
            className="bg-primary text-black font-bold px-8 py-3 rounded-lg flex items-center gap-2 hover:scale-105 transition-transform group inline-flex"
          >
            Shop Now
            <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
              arrow_outward
            </span>
          </Link>

          {/* Carousel Dots */}
          <div className="flex gap-2 mt-12">
            <span className="w-8 h-1.5 rounded-full bg-primary" />
            <span className="w-2 h-1.5 rounded-full bg-slate-600" />
            <span className="w-2 h-1.5 rounded-full bg-slate-600" />
          </div>
        </div>
      </div>

      {/* Recommended Sidebar */}
      <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-6">
        <h3 className="font-bold text-lg mb-6">Recommended for you</h3>

        <div className="space-y-6">
          {recommendedProducts.map((product) => (
            <RecommendedCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  )
}
