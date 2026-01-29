export default function PromoBanner() {
  return (
    <div className="relative bg-gradient-to-r from-primary to-green-600 rounded-2xl p-10 text-black mb-12 overflow-hidden shadow-2xl shadow-primary/20">
      {/* Decorative Circle */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/20 rounded-full blur-3xl" />

      <div className="relative z-10 text-center">
        <h2 className="text-3xl font-extrabold mb-2">
          10% Cashback on All Scripts – Limited Time!
        </h2>
        <p className="font-medium text-black/80 mb-6">
          Upgrade your toolkit and earn 10% back instantly when you buy any premium script or tool.
        </p>

        <button className="bg-black text-white px-8 py-3 rounded-lg font-bold hover:scale-105 transition-transform flex items-center gap-2 mx-auto">
          <span className="material-symbols-outlined">sell</span>
          Grab Offer Now
        </button>
      </div>
    </div>
  )
}
