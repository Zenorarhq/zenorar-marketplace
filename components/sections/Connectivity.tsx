import { connectivityOptions } from '@/lib/mock-data'
import ConnectivityCard from '@/components/cards/ConnectivityCard'

export default function Connectivity() {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold mb-6 text-primary">Connectivity</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {connectivityOptions.map((option) => (
          <ConnectivityCard key={option.id} option={option} />
        ))}
      </div>
    </section>
  )
}
