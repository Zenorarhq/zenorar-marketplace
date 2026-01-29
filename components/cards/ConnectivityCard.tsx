import Link from 'next/link'
import { ConnectivityOption } from '@/lib/types'

interface ConnectivityCardProps {
  option: ConnectivityOption
}

export default function ConnectivityCard({ option }: ConnectivityCardProps) {
  return (
    <Link
      href={option.href}
      className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-border-dark flex items-center gap-3 cursor-pointer hover:bg-primary/5 group"
    >
      <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">
        {option.icon}
      </span>
      <span className="text-sm font-medium">{option.name}</span>
    </Link>
  )
}
