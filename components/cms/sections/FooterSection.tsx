'use client'

import Link from 'next/link'
import Icon from '@/components/ui/Icon'

interface FooterLink {
  label?: string
  href?: string
}

interface FooterColumn {
  title?: string
  links?: FooterLink[]
}

interface SocialLink {
  icon?: string
  href?: string
  label?: string
}

interface FooterSectionProps {
  props: {
    logoText?: string
    logoIcon?: string
    description?: string
    columns?: FooterColumn[]
    showNewsletter?: boolean
    newsletterTitle?: string
    socialLinks?: SocialLink[]
    copyrightText?: string
    bottomLinks?: FooterLink[]
    backgroundColor?: string
  }
}

export default function FooterSection({ props }: FooterSectionProps) {
  const {
    logoText = 'Marketplace',
    logoIcon = 'grid-view',
    description = 'The premier destination for high-quality products and digital tools.',
    columns = [],
    showNewsletter = true,
    newsletterTitle = 'Newsletter',
    socialLinks = [],
    copyrightText,
    bottomLinks = [],
    backgroundColor,
  } = props

  const currentYear = new Date().getFullYear()
  const defaultCopyright = `© ${currentYear} ${logoText}. All rights reserved.`

  return (
    <footer
      className="bg-[#0d0d0d] border-t border-[#1f1f1f] pt-10 sm:pt-12 lg:pt-16 pb-6 sm:pb-8"
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 mb-10 sm:mb-12 lg:mb-16">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Brand Column */}
          <div className="md:col-span-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg sm:text-xl tracking-tight text-primary mb-4 sm:mb-6"
            >
              {logoIcon && <Icon name={logoIcon} size={24} />}
              {logoText}
            </Link>
            {description && (
              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* Link Columns */}
          {columns.length > 0 && (
            <div className={`md:col-span-6 grid grid-cols-2 ${columns.length >= 3 ? 'sm:grid-cols-3' : ''} gap-6 sm:gap-8`}>
              {columns.map((column, colIndex) => (
                <div key={colIndex} className={columns.length === 3 && colIndex === 2 ? 'col-span-2 sm:col-span-1' : ''}>
                  {column.title && (
                    <h4 className="font-bold mb-3 sm:mb-4 lg:mb-6 text-white text-sm sm:text-base">
                      {column.title}
                    </h4>
                  )}
                  {column.links && column.links.length > 0 && (
                    <ul className="space-y-2 sm:space-y-3 lg:space-y-4 text-xs sm:text-sm text-slate-500">
                      {column.links.map((link, linkIndex) => (
                        link.label && link.href && (
                          <li key={linkIndex}>
                            <Link
                              href={link.href}
                              className="hover:text-primary transition-colors"
                            >
                              {link.label}
                            </Link>
                          </li>
                        )
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Newsletter Column */}
          {showNewsletter && (
            <div className="md:col-span-3">
              <h4 className="font-bold mb-3 sm:mb-4 lg:mb-6 text-white text-sm sm:text-base">
                {newsletterTitle}
              </h4>
              <form className="flex gap-2">
                <label htmlFor="footer-newsletter-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="footer-newsletter-email"
                  type="email"
                  placeholder="Email address"
                  className="bg-[#141414] border border-[#2a2a2a] rounded-lg py-2 px-3 text-xs sm:text-sm focus:ring-1 focus:ring-primary focus:border-primary w-full text-slate-200 placeholder:text-slate-500 transition-all"
                />
                <button
                  type="submit"
                  className="bg-primary text-black px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold hover:brightness-110 transition-all"
                >
                  Join
                </button>
              </form>

              {/* Social Links */}
              {socialLinks.length > 0 && (
                <div className="flex gap-3 sm:gap-4 mt-5 sm:mt-6 lg:mt-8">
                  {socialLinks.map((social, index) => (
                    social.href && social.icon && (
                      <a
                        key={index}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-primary transition-colors"
                        aria-label={social.label || 'Social link'}
                      >
                        <Icon name={social.icon} size={22} />
                      </a>
                    )
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 border-t border-[#1f1f1f] pt-5 sm:pt-6 lg:pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-[10px] sm:text-xs">
        <p>{copyrightText || defaultCopyright}</p>
        {bottomLinks.length > 0 && (
          <div className="flex gap-4 sm:gap-6 lg:gap-8">
            {bottomLinks.map((link, index) => (
              link.label && link.href && (
                <Link
                  key={index}
                  href={link.href}
                  className="hover:text-slate-300 transition-colors"
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>
        )}
      </div>
    </footer>
  )
}
