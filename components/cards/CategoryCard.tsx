import Link from 'next/link'
import { Category } from '@/lib/types'

interface CategoryCardProps {
  category: Category
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={category.href}
      className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-slate-200 dark:border-border-dark flex items-center gap-4 group cursor-pointer hover:border-primary transition-all"
    >
      <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">
        {category.icon}
      </span>

      <div className="flex-1">
        <h4 className="font-bold text-sm">{category.name}</h4>
        <p className="text-[10px] text-slate-500 flex items-center gap-1 group-hover:text-primary transition-colors">
          Explore
          <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
        </p>
      </div>
    </Link>
  )
}
