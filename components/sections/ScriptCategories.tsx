import { scriptCategories } from '@/lib/mock-data'
import CategoryCard from '@/components/cards/CategoryCard'

export default function ScriptCategories() {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold mb-6 text-primary">Scripts Categories</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {scriptCategories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  )
}
