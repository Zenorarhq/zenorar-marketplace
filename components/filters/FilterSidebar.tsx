'use client'

import { filterCategories, filterLanguages } from '@/lib/mock-data'

export default function FilterSidebar() {
  return (
    <aside className="w-64 flex-shrink-0 space-y-8 bg-charcoal p-6 rounded-2xl border border-border-dark h-fit sticky top-24">
      {/* Category Filter */}
      <div>
        <h4 className="text-white font-bold text-sm mb-4">Category</h4>
        <div className="space-y-3">
          {filterCategories.map((category) => (
            <label
              key={category}
              className="flex items-center gap-3 text-sm text-slate-400 cursor-pointer group hover:text-white transition-colors"
            >
              <input
                type="checkbox"
                className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary focus:ring-offset-0"
              />
              {category}
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-white font-bold text-sm">Price Range</h4>
          <span className="text-[11px] text-primary font-bold">$0 - $1000</span>
        </div>
        <input
          type="range"
          min="0"
          max="1000"
          step="10"
          defaultValue={1000}
          className="w-full h-1.5 bg-border-dark rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Rating Filter */}
      <div>
        <h4 className="text-white font-bold text-sm mb-4">Rating</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm text-slate-400 cursor-pointer group hover:text-white transition-colors">
            <input
              type="checkbox"
              className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary focus:ring-offset-0"
            />
            <div className="flex text-yellow-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="material-symbols-outlined text-[16px] icon-filled">
                  star
                </span>
              ))}
            </div>
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-400 cursor-pointer group hover:text-white transition-colors">
            <input
              type="checkbox"
              className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary focus:ring-offset-0"
            />
            <div className="flex text-yellow-500">
              {[1, 2, 3, 4].map((star) => (
                <span key={star} className="material-symbols-outlined text-[16px] icon-filled">
                  star
                </span>
              ))}
              <span className="material-symbols-outlined text-[16px]">star</span>
              <span className="ml-1 text-[11px] text-slate-500">&amp; up</span>
            </div>
          </label>
        </div>
      </div>

      {/* Language Filter */}
      <div>
        <h4 className="text-white font-bold text-sm mb-4">Language</h4>
        <div className="grid grid-cols-2 gap-3">
          {filterLanguages.map((language) => (
            <label
              key={language}
              className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer group hover:text-white transition-colors"
            >
              <input
                type="checkbox"
                className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary focus:ring-offset-0"
              />
              {language}
            </label>
          ))}
        </div>
      </div>

      {/* Clear All Button */}
      <button className="w-full bg-border-dark text-slate-300 py-2 rounded-lg text-xs font-bold hover:bg-surface-dark transition-all border border-transparent hover:border-slate-700">
        Clear All
      </button>
    </aside>
  )
}
