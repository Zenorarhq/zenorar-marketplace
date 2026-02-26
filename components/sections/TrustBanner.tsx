export default function TrustBanner({ config }: { config?: { rating?: string; reviewCount?: string; trustStatement?: string; paymentStats?: string; style?: Record<string, any> } } = {}) {
  const sectionStyle = config?.style?.backgroundColor ? { backgroundColor: config.style.backgroundColor } : undefined
  return (
    <section className="mb-12 bg-charcoal border border-border-dark rounded-2xl py-6 px-4 md:py-10 md:px-8" style={sectionStyle}>
      <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-20">
        {/* Left: Rating */}
        <div className="flex items-center gap-5">
          <span className="text-4xl md:text-5xl font-extrabold text-white">
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
          {/* Payment Methods */}
          <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
            {/* Bitcoin */}
            <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center" title="Bitcoin">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z" fill="#F7931A"/><path d="M15.3 10.5c.2-1.3-.8-2-2.1-2.5l.4-1.7-1-.3-.4 1.6c-.3-.1-.5-.1-.8-.2l.4-1.6-1-.3-.4 1.7c-.2-.1-.4-.1-.6-.2l-1.4-.3-.3 1.1s.7.2.7.2c.4.1.5.4.5.6l-.5 2.1c0 0 .1 0 .1 0l-.1 0-.7 2.9c-.1.2-.2.4-.6.3 0 0-.7-.2-.7-.2l-.5 1.2 1.3.3c.2.1.5.1.7.2l-.4 1.7 1 .3.4-1.7c.3.1.5.1.8.2l-.4 1.7 1 .3.4-1.7c1.8.3 3.1.2 3.6-1.4.4-1.3 0-2-.9-2.5.7-.2 1.2-.6 1.3-1.5zm-2.3 3.3c-.3 1.3-2.4.6-3 .4l.5-2.2c.7.2 2.8.5 2.5 1.8zm.3-3.3c-.3 1.1-2 .6-2.5.4l.5-2c.6.1 2.3.4 2 1.6z" fill="white"/></svg>
            </div>
            {/* Ethereum */}
            <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center" title="Ethereum">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#627EEA"/><path d="M12 3v7.5l6 2.7L12 3z" fill="white" fillOpacity="0.6"/><path d="M12 3L6 13.2l6-2.7V3z" fill="white"/><path d="M12 16.5v4.5l6-8.5-6 4z" fill="white" fillOpacity="0.6"/><path d="M12 21v-4.5L6 12.5l6 8.5z" fill="white"/><path d="M12 15.5l6-2.8-6-2.7v5.5z" fill="white" fillOpacity="0.2"/><path d="M6 12.7l6 2.8V10l-6 2.7z" fill="white" fillOpacity="0.5"/></svg>
            </div>
            {/* USDC */}
            <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center" title="USDC">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#2775CA"/><path d="M12 4a8 8 0 100 16 8 8 0 000-16zm-.5 13.7v.8h-1v-.8c-1.5-.2-2.5-.9-2.7-2h1.4c.2.6.7 1 1.5 1 .9 0 1.4-.4 1.4-1s-.4-.9-1.5-1.1c-1.5-.3-2.6-.8-2.6-2.1 0-1 .7-1.8 2-2v-.8h1v.8c1.3.2 2.2.9 2.4 1.9h-1.4c-.1-.5-.6-.9-1.3-.9-.8 0-1.2.4-1.2.9 0 .6.5.8 1.5 1 1.5.3 2.6.8 2.6 2.2 0 1.1-.8 1.9-2.1 2.1z" fill="white"/></svg>
            </div>
            {/* Tether */}
            <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center" title="Tether (USDT)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#26A17B"/><path d="M13.5 10.8v-2h3.2V6.5H7.3v2.3h3.2v2c-2.7.1-4.8.7-4.8 1.4 0 .7 2.1 1.3 4.8 1.4v4.9h2.1v-4.9c2.7-.1 4.7-.7 4.7-1.4 0-.7-2-1.3-4.8-1.4zm-1 2.4c-2.8 0-4.7-.5-4.7-1.1 0-.5 1.6-.9 3.7-1v1.6h.1c.3 0 .6 0 .9 0v-1.6c2.1.1 3.7.5 3.7 1 0 .6-1.9 1.1-4.7 1.1h1z" fill="white"/></svg>
            </div>
            {/* Solana */}
            <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center" title="Solana">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#9945FF"/><path d="M7.5 14.5l1.3-1.3h7.7l-1.3 1.3H7.5zm0-3l1.3-1.3h7.7l-1.3 1.3H7.5zm8.9-1.7H8.8l1.3-1.3h7.7l-1.4 1.3z" fill="white"/></svg>
            </div>
            {/* Visa */}
            <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center" title="Visa">
              <svg width="20" height="10" viewBox="0 0 48 16" fill="none"><path d="M19.2 1.3l-3.8 13.4h-3.1l3.8-13.4h3.1zm15.4 8.7l1.6-4.5.9 4.5h-2.5zm3.5 4.7h2.9l-2.5-13.4H35.8c-.6 0-1.2.4-1.4 1l-5 11.4h3.5l.7-1.9h4.3l.2 1.9zm-8.7-4.4c0-3.5-4.9-3.7-4.9-5.3 0-.5.5-1 1.5-1.1.5 0 1.9-.1 3.4.6l.6-2.8c-.8-.3-1.9-.6-3.2-.6-3.4 0-5.8 1.8-5.8 4.4 0 1.9 1.7 3 3 3.6 1.3.7 1.8 1.1 1.7 1.7 0 .9-1 1.3-2 1.3-1.7 0-2.6-.5-3.4-.8l-.6 2.9c.8.4 2.2.7 3.7.7 3.6 0 6-1.8 6-4.6zM10.7 1.3L5 14.7H1.4L-1.5 4c-.2-.7-.3-.9-.9-1.2-.9-.5-2.3-.9-3.6-1.2l.1-.3h5.7c.7 0 1.4.5 1.5 1.3l1.4 7.5 3.5-8.8h3.5z" transform="translate(6 0)" fill="#94a3b8"/></svg>
            </div>
            {/* Mastercard */}
            <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center" title="Mastercard">
              <svg width="16" height="10" viewBox="0 0 32 20" fill="none"><circle cx="12" cy="10" r="7" fill="#EB001B" fillOpacity="0.5"/><circle cx="20" cy="10" r="7" fill="#F79E1B" fillOpacity="0.5"/><path d="M16 4.8a7 7 0 010 10.4 7 7 0 000-10.4z" fill="#FF5F00" fillOpacity="0.5"/></svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
