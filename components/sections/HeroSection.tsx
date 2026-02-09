'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { recommendedProducts } from '@/lib/mock-data'
import RecommendedCard from '@/components/cards/RecommendedCard'
import Icon from '@/components/ui/Icon'

const banners = [
  {
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop',
    title: 'Premium',
    titleHighlight: 'Scripts & Tools',
    subtitle: 'Discover our collection of high-quality automation scripts, bots, and developer tools.',
    buttonText: 'Browse Scripts',
    buttonLink: '/scripts',
  },
  {
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=2070&auto=format&fit=crop',
    title: 'Digital',
    titleHighlight: 'Gift Cards',
    subtitle: 'Shop gift cards for your favorite platforms, games, and services worldwide.',
    buttonText: 'Buy Gift Cards',
    buttonLink: '/gift-cards',
  },
  {
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2070&auto=format&fit=crop',
    title: 'Global',
    titleHighlight: 'eSIMs',
    subtitle: 'Stay connected anywhere with instant eSIMs for 190+ countries worldwide.',
    buttonText: 'Get eSIM',
    buttonLink: '/esim',
  },
  {
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=2070&auto=format&fit=crop',
    title: 'Virtual',
    titleHighlight: 'Phone Numbers',
    subtitle: 'Get instant virtual numbers for SMS verification and privacy protection.',
    buttonText: 'Get Number',
    buttonLink: '/virtual-numbers',
  },
]

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentSlide(index)
    setTimeout(() => setIsTransitioning(false), 500)
  }, [isTransitioning])

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % banners.length)
  }, [currentSlide, goToSlide])

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + banners.length) % banners.length)
  }, [currentSlide, goToSlide])

  // Auto-slide every 5 seconds
  useEffect(() => {
    const interval = setInterval(nextSlide, 5000)
    return () => clearInterval(interval)
  }, [nextSlide])

  // Handle touch/swipe events
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 50) {
      // Swiped left - go to next slide
      nextSlide()
    }

    if (touchStartX.current - touchEndX.current < -50) {
      // Swiped right - go to previous slide
      prevSlide()
    }
  }

  const currentBanner = banners[currentSlide]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
      {/* Main Hero */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="lg:col-span-2 relative rounded-2xl overflow-hidden bg-surface-dark border border-border-dark min-h-[300px] md:min-h-[400px] lg:min-h-[440px] flex items-center touch-pan-y"
      >
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
        <div className="relative z-10 px-4 sm:px-6 md:px-8 lg:px-12 max-w-lg">
          <div
            key={currentSlide}
            className="animate-fade-in"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4 leading-tight">
              {currentBanner.title} <br />
              <span className="text-primary">{currentBanner.titleHighlight}</span>
            </h1>
            <p className="text-slate-300 mb-4 md:mb-6 lg:mb-8 text-sm sm:text-base md:text-lg">
              {currentBanner.subtitle}
            </p>

            <Link
              href={currentBanner.buttonLink}
              className="bg-primary text-black font-bold px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 rounded-lg flex items-center gap-2 hover:scale-105 transition-transform group inline-flex text-sm sm:text-base"
            >
              {currentBanner.buttonText}
              <Icon name="arrow-up-right" size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Carousel Dots */}
          <div className="flex gap-2 mt-6 md:mt-8 lg:mt-12">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-1 md:h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'w-6 md:w-8 bg-primary'
                    : 'w-1.5 md:w-2 bg-slate-600 hover:bg-slate-500'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Navigation Arrows - Hidden on mobile to avoid interference with swipe */}
        <button
          onClick={prevSlide}
          className="hidden md:flex absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/50 border border-white/20 items-center justify-center text-white hover:bg-black/70 transition-colors z-20"
          aria-label="Previous slide"
        >
          <Icon name="arrow-left" size={16} />
        </button>
        <button
          onClick={nextSlide}
          className="hidden md:flex absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/50 border border-white/20 items-center justify-center text-white hover:bg-black/70 transition-colors z-20"
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
