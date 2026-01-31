import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '@/components/Providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tech Marketplace | Premium Digital Assets',
  description: 'Access premium scripts, instant connectivity, and essential tools for the modern digital life.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-25..0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} bg-background-dark text-slate-100 transition-colors duration-200`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
