'use client'

import Icon from '@/components/ui/Icon'

export interface VirtualNumberPricingSettings {
  durationMultiplier1d: number
  durationMultiplier7d: number
  durationMultiplier30d: number
  numberMarkupPercent: number
  minuteMarkupPercent: number
  minPrice1d: number
  minPrice7d: number
  minPrice30d: number
  smsLimit1d: number
  smsLimit7d: number
  smsLimit30d: number
  businessAddon1d: number
  businessAddon7d: number
  businessAddon30d: number
  minutePackages: { minutes: number; basePrice: number }[]
}

export const defaultVirtualNumberPricing: VirtualNumberPricingSettings = {
  durationMultiplier1d: 20,
  durationMultiplier7d: 50,
  durationMultiplier30d: 100,
  numberMarkupPercent: 500,
  minuteMarkupPercent: 300,
  minPrice1d: 2,
  minPrice7d: 5,
  minPrice30d: 10,
  smsLimit1d: 50,
  smsLimit7d: 200,
  smsLimit30d: 500,
  businessAddon1d: 3,
  businessAddon7d: 12,
  businessAddon30d: 30,
  minutePackages: [
    { minutes: 30, basePrice: 0.81 },
    { minutes: 60, basePrice: 1.62 },
    { minutes: 120, basePrice: 3.24 },
  ],
}

interface VirtualNumberPricingSectionProps {
  pricing: VirtualNumberPricingSettings
  onChange: (pricing: VirtualNumberPricingSettings) => void
  expanded: boolean
  onToggle: () => void
}

export default function VirtualNumberPricingSection({
  pricing,
  onChange,
  expanded,
  onToggle
}: VirtualNumberPricingSectionProps) {
  // Calculate example prices
  const calculateExamplePrice = (baseCost: number, durationMultiplier: number, markup: number) => {
    const basePrice = baseCost * (durationMultiplier / 100) * (1 + markup / 100)
    return Math.max(basePrice, 0.01).toFixed(2)
  }

  return (
    <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon name="tag" size={24} className="text-primary" />
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-lg">Virtual Number Markup</p>
            <p className="text-slate-500 text-sm">Markups, duration multipliers, minimum prices, and minute packages</p>
          </div>
        </div>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          className="text-slate-400 flex-shrink-0"
        />
      </button>

      {expanded && (
        <div className="mt-6 pt-6 border-t border-[#1f1f1f] space-y-6">
          {/* Profit Markups */}
          <div>
            <h4 className="text-white font-medium mb-4">Profit Markups</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Number Markup %</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={pricing.numberMarkupPercent}
                    onChange={(e) => onChange({ ...pricing, numberMarkupPercent: Number(e.target.value) })}
                    className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  />
                  <span className="text-slate-400">%</span>
                </div>
                <p className="text-xs text-slate-600">500% = 6× the provider cost</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Minute Rate Markup %</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={pricing.minuteMarkupPercent}
                    onChange={(e) => onChange({ ...pricing, minuteMarkupPercent: Number(e.target.value) })}
                    className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  />
                  <span className="text-slate-400">%</span>
                </div>
                <p className="text-xs text-slate-600">300% = 4× the per-minute cost</p>
              </div>
            </div>
          </div>

          {/* Duration-Based Settings */}
          <div>
            <h4 className="text-white font-medium mb-4">Duration Settings</h4>
            <p className="text-slate-500 text-sm mb-4">Configure pricing and limits for each rental duration</p>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-400 border-b border-[#2a2a2a]">
                    <th className="pb-3 pr-4 font-medium">Setting</th>
                    <th className="pb-3 px-4 font-medium text-center">24 Hours</th>
                    <th className="pb-3 px-4 font-medium text-center">7 Days</th>
                    <th className="pb-3 px-4 font-medium text-center">30 Days</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {/* Duration Multiplier */}
                  <tr className="border-b border-[#1f1f1f]">
                    <td className="py-3 pr-4">
                      <p className="text-slate-300 font-medium">Duration Multiplier</p>
                      <p className="text-xs text-slate-600">% of monthly cost</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <input type="number" value={pricing.durationMultiplier1d} onChange={(e) => onChange({ ...pricing, durationMultiplier1d: Number(e.target.value) })} className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-primary/50" />
                        <span className="text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <input type="number" value={pricing.durationMultiplier7d} onChange={(e) => onChange({ ...pricing, durationMultiplier7d: Number(e.target.value) })} className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-primary/50" />
                        <span className="text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <input type="number" value={pricing.durationMultiplier30d} onChange={(e) => onChange({ ...pricing, durationMultiplier30d: Number(e.target.value) })} className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-primary/50" />
                        <span className="text-slate-500">%</span>
                      </div>
                    </td>
                  </tr>
                  {/* Minimum Price */}
                  <tr className="border-b border-[#1f1f1f]">
                    <td className="py-3 pr-4">
                      <p className="text-slate-300 font-medium">Min Price (Floor)</p>
                      <p className="text-xs text-slate-600">Price won't go below this</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">$</span>
                        <input type="number" step="0.01" value={pricing.minPrice1d} onChange={(e) => onChange({ ...pricing, minPrice1d: Number(e.target.value) })} className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-primary/50" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">$</span>
                        <input type="number" step="0.01" value={pricing.minPrice7d} onChange={(e) => onChange({ ...pricing, minPrice7d: Number(e.target.value) })} className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-primary/50" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">$</span>
                        <input type="number" step="0.01" value={pricing.minPrice30d} onChange={(e) => onChange({ ...pricing, minPrice30d: Number(e.target.value) })} className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-primary/50" />
                      </div>
                    </td>
                  </tr>
                  {/* SMS Limit */}
                  <tr className="border-b border-[#1f1f1f]">
                    <td className="py-3 pr-4">
                      <p className="text-slate-300 font-medium">SMS Limit (Basic)</p>
                      <p className="text-xs text-slate-600">Max SMS for basic plan</p>
                    </td>
                    <td className="py-3 px-4">
                      <input type="number" value={pricing.smsLimit1d} onChange={(e) => onChange({ ...pricing, smsLimit1d: Number(e.target.value) })} className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-primary/50" />
                    </td>
                    <td className="py-3 px-4">
                      <input type="number" value={pricing.smsLimit7d} onChange={(e) => onChange({ ...pricing, smsLimit7d: Number(e.target.value) })} className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-primary/50" />
                    </td>
                    <td className="py-3 px-4">
                      <input type="number" value={pricing.smsLimit30d} onChange={(e) => onChange({ ...pricing, smsLimit30d: Number(e.target.value) })} className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-primary/50" />
                    </td>
                  </tr>
                  {/* Business Add-on */}
                  <tr>
                    <td className="py-3 pr-4">
                      <p className="text-slate-300 font-medium">Business Add-on</p>
                      <p className="text-xs text-slate-600">Extra for voice/forwarding</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">+$</span>
                        <input type="number" step="0.01" value={pricing.businessAddon1d} onChange={(e) => onChange({ ...pricing, businessAddon1d: Number(e.target.value) })} className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-primary/50" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">+$</span>
                        <input type="number" step="0.01" value={pricing.businessAddon7d} onChange={(e) => onChange({ ...pricing, businessAddon7d: Number(e.target.value) })} className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-primary/50" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">+$</span>
                        <input type="number" step="0.01" value={pricing.businessAddon30d} onChange={(e) => onChange({ ...pricing, businessAddon30d: Number(e.target.value) })} className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-primary/50" />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Price Preview */}
          <div className="bg-[#1a1a1a] rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Price Preview (assuming $1/mo provider cost)</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-500 mb-1">24hr Basic</p>
                <p className="text-primary font-bold">
                  ${Math.max(
                    Number(calculateExamplePrice(1, pricing.durationMultiplier1d, pricing.numberMarkupPercent)),
                    pricing.minPrice1d
                  ).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">7d Basic</p>
                <p className="text-primary font-bold">
                  ${Math.max(
                    Number(calculateExamplePrice(1, pricing.durationMultiplier7d, pricing.numberMarkupPercent)),
                    pricing.minPrice7d
                  ).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">30d Basic</p>
                <p className="text-primary font-bold">
                  ${Math.max(
                    Number(calculateExamplePrice(1, pricing.durationMultiplier30d, pricing.numberMarkupPercent)),
                    pricing.minPrice30d
                  ).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">24hr Business</p>
                <p className="text-blue-400 font-bold">
                  ${(Math.max(
                    Number(calculateExamplePrice(1, pricing.durationMultiplier1d, pricing.numberMarkupPercent)),
                    pricing.minPrice1d
                  ) + pricing.businessAddon1d).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">7d Business</p>
                <p className="text-blue-400 font-bold">
                  ${(Math.max(
                    Number(calculateExamplePrice(1, pricing.durationMultiplier7d, pricing.numberMarkupPercent)),
                    pricing.minPrice7d
                  ) + pricing.businessAddon7d).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">30d Business</p>
                <p className="text-blue-400 font-bold">
                  ${(Math.max(
                    Number(calculateExamplePrice(1, pricing.durationMultiplier30d, pricing.numberMarkupPercent)),
                    pricing.minPrice30d
                  ) + pricing.businessAddon30d).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Minute Packages */}
          <div>
            <h4 className="text-white font-medium mb-4">Minute Packages</h4>
            <p className="text-slate-500 text-sm mb-4">
              Call forwarding minute tiers for Business plans. Base prices are the provider cost (Twilio: ~$0.027/min for US calls).
              Final price = Base × (1 + Minute Markup %)
            </p>
            <div className="space-y-3">
              {pricing.minutePackages.map((pkg, idx) => {
                const finalPrice = Math.ceil(pkg.basePrice * (1 + pricing.minuteMarkupPercent / 100))
                return (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-[#1a1a1a] rounded-lg">
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Minutes</label>
                        <input
                          type="number"
                          value={pkg.minutes}
                          onChange={(e) => {
                            const newPackages = [...pricing.minutePackages]
                            newPackages[idx].minutes = Number(e.target.value)
                            onChange({ ...pricing, minutePackages: newPackages })
                          }}
                          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Base Cost</label>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={pkg.basePrice}
                            onChange={(e) => {
                              const newPackages = [...pricing.minutePackages]
                              newPackages[idx].basePrice = Number(e.target.value)
                              onChange({ ...pricing, minutePackages: newPackages })
                            }}
                            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Final Price</label>
                        <p className="text-lg font-bold text-green-400 py-2">${finalPrice}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
