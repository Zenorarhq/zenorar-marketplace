import Link from 'next/link'
import { Category } from '@/lib/types'
import Icon from '@/components/ui/Icon'

interface CategoryCardProps {
  category: Category
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={category.href}
      className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-slate-200 dark:border-border-dark flex items-center gap-4 group cursor-pointer hover:border-primary transition-all"
    >
      <div className="text-primary bg-primary/10 p-2 rounded-lg">
        <Icon name={category.icon} size={24} />
      </div>

      <div className="flex-1">
        <h4 className="font-bold text-sm">{category.name}</h4>
        <p className="text-[10px] text-slate-500 flex items-center gap-1 group-hover:text-primary transition-colors">
          Explore
          <Icon name="arrow-right" size={12} />
        </p>
      </div>
    </Link>
  )
}
