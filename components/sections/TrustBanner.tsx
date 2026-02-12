export default function TrustBanner({ config }: { config?: { rating?: string; reviewCount?: string; trustStatement?: string; paymentStats?: string; style?: Record<string, any> } } = {}) {
  const sectionStyle = config?.style?.backgroundColor ? { backgroundColor: config.style.backgroundColor } : undefined
  return (
    <section className="mb-12 bg-charcoal border border-border-dark rounded-2xl py-10 px-8" style={sectionStyle}>
      <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-20">
        {/* Left: Rating */}
        <div className="flex items-center gap-5">
          <span className="text-5xl font-extrabold text-white">
            {config?.rating || '4.8'}<span className="text-2xl text-slate-400 font-bold">/5</span>
          </span>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-white text-sm font-medium mr-1">Trustpilot</span>
              {[...Array(5)].map((_, i) => (
                <span key={i} className="w-5 h-5 bg-green-500 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </span>
              ))}
            </div>
            <p className="text-slate-400 text-sm">{config?.reviewCount || 'Over 1,000 5 star reviews'}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-14 bg-border-dark" />

        {/* Right: Trust stats */}
        <div className="text-center md:text-left">
          <p className="text-xl font-bold text-white mb-1">{config?.trustStatement || 'Trusted since 2020'}</p>
          <p className="text-slate-400 text-sm">{config?.paymentStats || '10k+ payments processed every day'}</p>
        </div>
      </div>
    </section>
  )
}
