import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-surface-dark border-t border-border-dark pt-16 pb-8">
      <div className="max-w-container mx-auto px-8 lg:px-12 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
        {/* Brand Column */}
        <div className="lg:col-span-1">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary mb-6"
          >
            <span className="material-symbols-outlined text-2xl">grid_view</span>
            Marketplace
          </Link>
          <p className="text-slate-500 text-sm leading-relaxed">
            The premier destination for high-quality scripts, global connectivity solutions, and digital tools for professionals.
          </p>
        </div>

        {/* Products Column */}
        <div>
          <h4 className="font-bold mb-6 text-white">Products</h4>
          <ul className="space-y-4 text-sm text-slate-500">
            <li>
              <Link href="/products?category=scripts" className="hover:text-primary transition-colors">
                Premium Scripts
              </Link>
            </li>
            <li>
              <Link href="/products?category=esims" className="hover:text-primary transition-colors">
                Global eSIMs
              </Link>
            </li>
            <li>
              <Link href="/products?category=virtual-numbers" className="hover:text-primary transition-colors">
                Virtual Numbers
              </Link>
            </li>
            <li>
              <Link href="/products?category=api" className="hover:text-primary transition-colors">
                API Services
              </Link>
            </li>
          </ul>
        </div>

        {/* Support Column */}
        <div>
          <h4 className="font-bold mb-6 text-white">Support</h4>
          <ul className="space-y-4 text-sm text-slate-500">
            <li>
              <Link href="/help" className="hover:text-primary transition-colors">
                Help Center
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-primary transition-colors">
                Contact Us
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-primary transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>

        {/* Community Column */}
        <div>
          <h4 className="font-bold mb-6 text-white">Community</h4>
          <ul className="space-y-4 text-sm text-slate-500">
            <li>
              <Link href="/forum" className="hover:text-primary transition-colors">
                Developer Forum
              </Link>
            </li>
            <li>
              <Link href="/discord" className="hover:text-primary transition-colors">
                Discord Server
              </Link>
            </li>
            <li>
              <Link href="/partners" className="hover:text-primary transition-colors">
                Partner Program
              </Link>
            </li>
          </ul>
        </div>

        {/* Newsletter Column */}
        <div>
          <h4 className="font-bold mb-6 text-white">Newsletter</h4>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Email address"
              className="bg-background-dark border-none rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary w-full text-slate-200 placeholder:text-slate-500"
            />
            <button className="bg-primary text-black px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 transition-all">
              Join
            </button>
          </div>
          <div className="flex gap-4 mt-8">
            <Link href="#" className="text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">public</span>
            </Link>
            <Link href="#" className="text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">alternate_email</span>
            </Link>
            <Link href="#" className="text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">forum</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-container mx-auto px-8 lg:px-12 border-t border-border-dark pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-xs">
        <p>&copy; 2024 Marketplace Inc. All rights reserved.</p>
        <div className="flex gap-8">
          <Link href="/terms" className="hover:text-slate-300 transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-slate-300 transition-colors">
            Privacy
          </Link>
          <Link href="/cookies" className="hover:text-slate-300 transition-colors">
            Cookies
          </Link>
        </div>
      </div>
    </footer>
  )
}
