'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { recommendedProducts } from '@/lib/mock-data'
import RecommendedCard from '@/components/cards/RecommendedCard'
import Icon from '@/components/ui/Icon'

const banners = [
  {
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9zmjTWwkSIvRt_r_zJS1pESJGySilOPv_BT2beUj4tLs8wRpIY4iW-nRJQd6OJ8IyrG8LJqg9QEkdv8fJxxqkZb3a4HFt31h8q2F8BZ_LANkp-OfbK4graOrsBsDt_4oxxO7ZJEVt4-OJfGKJHbHLxrqO1cHeksGSqsL_JhUaq-tsTCFwj0P98Zm3q6YSDwAFYy54t87GRKruTCmcWfOsij78_GYuyfu2OUsm_iReGEX1oCqxRIOveP0rQio4MOzBF7sB7e-m2OTF',
    title: 'Power Your',
    titleHighlight: 'Digital World',
    subtitle: 'Access premium scripts, instant connectivity, and essential tools for the modern digital life.',
    buttonText: 'Shop Now',
    buttonLink: '/products',
  },
  {
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop',
    title: 'Premium',
    titleHighlight: 'Scripts & Tools',
    subtitle: 'Discover our collection of high-quality automation scripts, bots, and developer tools.',
    buttonText: 'Browse Scripts',
    buttonLink: '/products?category=scripts',
  },
  {
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2070&auto=format&fit=crop',
    title: 'Stay Connected',
    titleHighlight: 'Anywhere',
    subtitle: 'Global eSIMs and virtual numbers for seamless connectivity in 190+ countries.',
    buttonText: 'Get Connected',
    buttonLink: '/products?category=esims',
  },
]

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentSlide(index)
    setTimeout(() => setIsTransitioning(false), 500)
  }, [isTransitioning])

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % banners.length)
  }, [currentSlide, goToSlide])

  // Auto-slide every 5 seconds
  useEffect(() => {
    const interval = setInterval(nextSlide, 5000)
    return () => clearInterval(interval)
  }, [nextSlide])

  const currentBanner = banners[currentSlide]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
      {/* Main Hero */}
      <div className="lg:col-span-2 relative rounded-2xl overflow-hidden bg-surface-dark border border-border-dark min-h-[440px] flex items-center">
        {/* Background Images */}
        {banners.map((banner, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Image
              src={banner.image}
              alt={`${banner.title} ${banner.titleHighlight}`}
              fill
              className="object-cover opacity-40"
              priority={index === 0}
            />
          </div>
        ))}

        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />

        {/* Content */}
        <div className="relative z-10 px-12 max-w-lg">
          <div
            key={currentSlide}
            className="animate-fade-in"
          >
            <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
              {currentBanner.title} <br />
              <span className="text-primary">{currentBanner.titleHighlight}</span>
            </h1>
            <p className="text-slate-300 mb-8 text-lg">
              {currentBanner.subtitle}
            </p>

            <Link
              href={currentBanner.buttonLink}
              className="bg-primary text-black font-bold px-8 py-3 rounded-lg flex items-center gap-2 hover:scale-105 transition-transform group inline-flex"
            >
              {currentBanner.buttonText}
              <Icon name="arrow-up-right" size={20} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Carousel Dots */}
          <div className="flex gap-2 mt-12">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'w-8 bg-primary'
                    : 'w-2 bg-slate-600 hover:bg-slate-500'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={() => goToSlide((currentSlide - 1 + banners.length) % banners.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-colors z-20"
          aria-label="Previous slide"
        >
          <Icon name="arrow-left" size={16} />
        </button>
        <button
          onClick={() => goToSlide((currentSlide + 1) % banners.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-colors z-20"
          aria-label="Next slide"
        >
          <Icon name="arrow-right" size={16} />
        </button>
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
