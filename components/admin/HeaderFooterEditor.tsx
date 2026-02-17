'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import { iconMap } from '@/components/ui/Icon'
import { settingsApi } from '@/lib/api/settings'

const ALL_ICON_NAMES = Object.keys(iconMap) as string[]

// ─── Types ──────────────────────────────────────────────────────────────

interface NavChild { label: string; url: string }
interface NavLink { label: string; url: string; children?: NavChild[] }
interface SocialLink { platform: string; url: string }
interface FooterColumn { title: string; links: { label: string; url: string }[] }

interface AnnouncementConfig {
  enabled: boolean
  text: string
  linkUrl: string
  backgroundColor: string
  textColor: string
  icon: string
}

interface HeaderConfig {
  navigation: NavLink[]
  showSearch: boolean
  showCart: boolean
  ctaButton: { text: string; url: string } | null
  showSiteName: boolean
  logoMaxHeight: 'small' | 'medium' | 'large'
  sticky: boolean
  backgroundStyle: 'blur' | 'solid' | 'transparent'
}

interface FooterConfig {
  columns: FooterColumn[]
  showNewsletter: boolean
  newsletterTitle: string
  socialLinks: SocialLink[]
  copyrightText: string
  backgroundColor: string
  textColor: string
  padding: 'compact' | 'default' | 'spacious'
  columnGap: 'tight' | 'default' | 'wide'
  bottomLinks: { label: string; url: string }[]
  logoSize: 'small' | 'medium' | 'large'
  description: string
}

const DEFAULT_ANNOUNCEMENT: AnnouncementConfig = {
  enabled: false, text: '', linkUrl: '', backgroundColor: '#43D678', textColor: '#000000', icon: '',
}

const DEFAULT_HEADER: HeaderConfig = {
  navigation: [], showSearch: true, showCart: true, ctaButton: null,
  showSiteName: true, logoMaxHeight: 'medium', sticky: true, backgroundStyle: 'blur',
}

const DEFAULT_FOOTER: FooterConfig = {
  columns: [
    { title: 'Products', links: [{ label: 'Premium Scripts', url: '/scripts' }, { label: 'Global eSIMs', url: '/esim' }] },
    { title: 'Support', links: [{ label: 'Help Center', url: '/help' }, { label: 'Contact Us', url: '/contact' }, { label: 'My Account', url: '/profile' }] },
    { title: 'Community', links: [{ label: 'Help Center', url: '/help' }, { label: 'Contact Us', url: '/contact' }] },
  ],
  showNewsletter: true, newsletterTitle: 'Newsletter', socialLinks: [], copyrightText: '',
  backgroundColor: '', textColor: '', padding: 'default', columnGap: 'default', bottomLinks: [],
  logoSize: 'medium', description: '',
}

const SOCIAL_PLATFORMS = ['Twitter', 'Facebook', 'Instagram', 'YouTube', 'Discord', 'LinkedIn', 'TikTok', 'GitHub']

type TabType = 'announcement' | 'header' | 'footer'

function parseSettingValue<T>(raw: any, fallback: T): T {
  if (!raw?.value) return fallback
  try {
    const parsed = typeof raw.value === 'string' ? JSON.parse(raw.value) : raw.value
    return { ...fallback, ...parsed }
  } catch { return fallback }
}

const inputCls = 'w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50'
const smallCls = 'flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50'
const selectCls = 'bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-primary/50'
const checkCls = 'w-4 h-4 rounded border-[#2a2a2a] bg-[#1a1a1a] text-primary focus:ring-primary/50'

// ─── Component ──────────────────────────────────────────────────────────

export default function HeaderFooterEditor() {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('announcement')
  const [announcement, setAnnouncement] = useState<AnnouncementConfig>(DEFAULT_ANNOUNCEMENT)
  const [header, setHeader] = useState<HeaderConfig>(DEFAULT_HEADER)
  const [footer, setFooter] = useState<FooterConfig>(DEFAULT_FOOTER)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [iconSearch, setIconSearch] = useState('')

  useEffect(() => {
    if (!expanded) return
    setLoading(true)
    Promise.all([
      settingsApi.getSetting('site_announcement'),
      settingsApi.getSetting('site_header'),
      settingsApi.getSetting('site_footer'),
    ]).then(([aRes, hRes, fRes]) => {
      if (aRes.success && aRes.data) setAnnouncement(parseSettingValue(aRes.data, DEFAULT_ANNOUNCEMENT))
      if (hRes.success && hRes.data) setHeader(parseSettingValue(hRes.data, DEFAULT_HEADER))
      if (fRes.success && fRes.data) setFooter(parseSettingValue(fRes.data, DEFAULT_FOOTER))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [expanded])

  async function handleSave() {
    setSaving(true)
    try {
      await settingsApi.updateSettings([
        { key: 'site_announcement', value: JSON.stringify(announcement), group: 'cms', isPublic: true },
        { key: 'site_header', value: JSON.stringify(header), group: 'cms', isPublic: true },
        { key: 'site_footer', value: JSON.stringify(footer), group: 'cms', isPublic: true },
      ])
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  // ─── Header Nav Helpers ──────────────────────────────────────────────

  function addNavLink() {
    setHeader(h => ({ ...h, navigation: [...h.navigation, { label: '', url: '', children: [] }] }))
  }
  function updateNavLink(i: number, field: string, value: string) {
    setHeader(h => ({ ...h, navigation: h.navigation.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }))
  }
  function removeNavLink(i: number) {
    setHeader(h => ({ ...h, navigation: h.navigation.filter((_, idx) => idx !== i) }))
  }
  function addNavChild(pi: number) {
    setHeader(h => ({ ...h, navigation: h.navigation.map((l, i) => i === pi ? { ...l, children: [...(l.children || []), { label: '', url: '' }] } : l) }))
  }
  function updateNavChild(pi: number, ci: number, field: string, value: string) {
    setHeader(h => ({ ...h, navigation: h.navigation.map((l, i) => i === pi ? { ...l, children: (l.children || []).map((c, j) => j === ci ? { ...c, [field]: value } : c) } : l) }))
  }
  function removeNavChild(pi: number, ci: number) {
    setHeader(h => ({ ...h, navigation: h.navigation.map((l, i) => i === pi ? { ...l, children: (l.children || []).filter((_, j) => j !== ci) } : l) }))
  }

  // ─── Footer Helpers ──────────────────────────────────────────────────

  function addFooterColumn() {
    if (footer.columns.length >= 4) return
    setFooter(f => ({ ...f, columns: [...f.columns, { title: '', links: [] }] }))
  }
  function removeFooterColumn(i: number) {
    setFooter(f => ({ ...f, columns: f.columns.filter((_, idx) => idx !== i) }))
  }
  function updateColumnTitle(ci: number, title: string) {
    setFooter(f => ({ ...f, columns: f.columns.map((col, i) => i === ci ? { ...col, title } : col) }))
  }
  function addColumnLink(ci: number) {
    setFooter(f => ({ ...f, columns: f.columns.map((col, i) => i === ci ? { ...col, links: [...col.links, { label: '', url: '' }] } : col) }))
  }
  function updateColumnLink(ci: number, li: number, field: 'label' | 'url', value: string) {
    setFooter(f => ({ ...f, columns: f.columns.map((col, i) => i === ci ? { ...col, links: col.links.map((lk, j) => j === li ? { ...lk, [field]: value } : lk) } : col) }))
  }
  function removeColumnLink(ci: number, li: number) {
    setFooter(f => ({ ...f, columns: f.columns.map((col, i) => i === ci ? { ...col, links: col.links.filter((_, j) => j !== li) } : col) }))
  }
  function addSocialLink() {
    setFooter(f => ({ ...f, socialLinks: [...f.socialLinks, { platform: 'Twitter', url: '' }] }))
  }
  function updateSocialLink(i: number, field: 'platform' | 'url', value: string) {
    setFooter(f => ({ ...f, socialLinks: f.socialLinks.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }))
  }
  function removeSocialLink(i: number) {
    setFooter(f => ({ ...f, socialLinks: f.socialLinks.filter((_, idx) => idx !== i) }))
  }
  function addBottomLink() {
    setFooter(f => ({ ...f, bottomLinks: [...f.bottomLinks, { label: '', url: '' }] }))
  }
  function updateBottomLink(i: number, field: 'label' | 'url', value: string) {
    setFooter(f => ({ ...f, bottomLinks: f.bottomLinks.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }))
  }
  function removeBottomLink(i: number) {
    setFooter(f => ({ ...f, bottomLinks: f.bottomLinks.filter((_, idx) => idx !== i) }))
  }

  // ─── Render ──────────────────────────────────────────────────────────

  const tabs: { id: TabType; label: string }[] = [
    { id: 'announcement', label: 'Announcement' },
    { id: 'header', label: 'Header' },
    { id: 'footer', label: 'Footer' },
  ]

  return (
    <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl mb-6 overflow-hidden">
      {/* Collapsed Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <Icon name="layers" size={20} className="text-blue-400" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-white font-medium text-sm block">Header & Footer</span>
          <span className="text-slate-500 text-xs">
            Announcement bar, navigation, branding, footer columns & styling
          </span>
        </div>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} className="text-slate-400" />
      </button>

      {/* Expanded Editor */}
      {expanded && (
        <div className="border-t border-[#1f1f1f] p-4 space-y-4">
          {loading ? (
            <div className="text-center py-6">
              <Icon name="loading" size={24} className="text-primary animate-spin mx-auto" />
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id ? 'bg-primary text-black' : 'bg-[#1a1a1a] text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ═══ ANNOUNCEMENT TAB ═══ */}
              {activeTab === 'announcement' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm">Enable Announcement Bar</span>
                    <div
                      onClick={() => setAnnouncement(a => ({ ...a, enabled: !a.enabled }))}
                      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${announcement.enabled ? 'bg-primary' : 'bg-[#2a2a2a]'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${announcement.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                    </div>
                  </div>

                  {announcement.enabled && (
                    <>
                      {/* Preview */}
                      <div
                        className="rounded-lg text-center py-2 px-4 text-sm font-medium"
                        style={{ backgroundColor: announcement.backgroundColor, color: announcement.textColor }}
                      >
                        {announcement.icon && <Icon name={announcement.icon} size={16} className="mr-2 inline-block" />}
                        {announcement.text || 'Your announcement text here...'}
                      </div>

                      <div>
                        <p className="text-slate-400 text-xs font-medium mb-1">Announcement Text</p>
                        <input type="text" value={announcement.text} onChange={e => setAnnouncement(a => ({ ...a, text: e.target.value }))} placeholder="e.g. Free shipping on orders over $50!" className={inputCls} />
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-medium mb-1">Link URL (optional)</p>
                        <input type="text" value={announcement.linkUrl} onChange={e => setAnnouncement(a => ({ ...a, linkUrl: e.target.value }))} placeholder="/sale or https://..." className={inputCls} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-slate-400 text-xs font-medium mb-1">Background Color</p>
                          <div className="flex gap-2">
                            <input type="color" value={announcement.backgroundColor} onChange={e => setAnnouncement(a => ({ ...a, backgroundColor: e.target.value }))} className="w-8 h-8 rounded border border-[#2a2a2a] bg-transparent cursor-pointer" />
                            <input type="text" value={announcement.backgroundColor} onChange={e => setAnnouncement(a => ({ ...a, backgroundColor: e.target.value }))} className={smallCls} />
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs font-medium mb-1">Text Color</p>
                          <div className="flex gap-2">
                            <input type="color" value={announcement.textColor} onChange={e => setAnnouncement(a => ({ ...a, textColor: e.target.value }))} className="w-8 h-8 rounded border border-[#2a2a2a] bg-transparent cursor-pointer" />
                            <input type="text" value={announcement.textColor} onChange={e => setAnnouncement(a => ({ ...a, textColor: e.target.value }))} className={smallCls} />
                          </div>
                        </div>
                      </div>

                      {/* Icon Picker */}
                      <div>
                        <p className="text-slate-400 text-xs font-medium mb-1">Icon (optional)</p>
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={() => setShowIconPicker(!showIconPicker)}
                            className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-slate-300 hover:border-primary/50 transition-colors"
                          >
                            {announcement.icon ? (
                              <>
                                <Icon name={announcement.icon} size={16} />
                                <span>{announcement.icon}</span>
                              </>
                            ) : (
                              <span className="text-slate-500">No icon</span>
                            )}
                            <Icon name={showIconPicker ? 'chevron-up' : 'chevron-down'} size={14} className="text-slate-500" />
                          </button>
                          {announcement.icon && (
                            <button
                              onClick={() => setAnnouncement(a => ({ ...a, icon: '' }))}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        {showIconPicker && (
                          <div className="bg-[#0e0e0e] border border-[#1f1f1f] rounded-lg p-3">
                            <input
                              type="text"
                              value={iconSearch}
                              onChange={e => setIconSearch(e.target.value)}
                              placeholder="Search icons..."
                              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 mb-2"
                            />
                            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 max-h-48 overflow-y-auto">
                              {ALL_ICON_NAMES.filter(name => !iconSearch || name.includes(iconSearch.toLowerCase())).map(name => (
                                <button
                                  key={name}
                                  onClick={() => { setAnnouncement(a => ({ ...a, icon: name })); setShowIconPicker(false); setIconSearch('') }}
                                  className={`w-full aspect-square flex items-center justify-center rounded-lg transition-colors ${announcement.icon === name ? 'bg-primary/20 text-primary' : 'bg-[#1a1a1a] text-slate-400 hover:bg-white/10 hover:text-white'}`}
                                  title={name}
                                >
                                  <Icon name={name} size={18} />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ═══ HEADER TAB ═══ */}
              {activeTab === 'header' && (
                <div className="space-y-4">
                  {/* Branding */}
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-2">Logo & Branding</p>
                    <div className="flex items-center gap-6 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={header.showSiteName} onChange={e => setHeader(h => ({ ...h, showSiteName: e.target.checked }))} className={checkCls} />
                        <span className="text-slate-300 text-sm">Show Site Name</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">Logo Size:</span>
                        <select value={header.logoMaxHeight} onChange={e => setHeader(h => ({ ...h, logoMaxHeight: e.target.value as any }))} className={selectCls + ' text-xs py-1'}>
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Display Options */}
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-2">Display Options</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={header.showSearch} onChange={e => setHeader(h => ({ ...h, showSearch: e.target.checked }))} className={checkCls} />
                        <span className="text-slate-300 text-sm">Search</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={header.showCart} onChange={e => setHeader(h => ({ ...h, showCart: e.target.checked }))} className={checkCls} />
                        <span className="text-slate-300 text-sm">Cart</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={header.sticky} onChange={e => setHeader(h => ({ ...h, sticky: e.target.checked }))} className={checkCls} />
                        <span className="text-slate-300 text-sm">Sticky</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">Background:</span>
                        <select value={header.backgroundStyle} onChange={e => setHeader(h => ({ ...h, backgroundStyle: e.target.value as any }))} className={selectCls + ' text-xs py-1'}>
                          <option value="blur">Blur</option>
                          <option value="solid">Solid</option>
                          <option value="transparent">Transparent</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-400 text-xs font-medium">Navigation Links</p>
                      <button onClick={addNavLink} className="text-xs text-primary hover:text-primary/80 font-medium">+ Add Link</button>
                    </div>
                    <div className="space-y-2">
                      {header.navigation.map((link, i) => (
                        <div key={i} className="bg-[#0e0e0e] border border-[#1f1f1f] rounded-lg p-2">
                          <div className="flex gap-2 items-center">
                            <input type="text" value={link.label} onChange={e => updateNavLink(i, 'label', e.target.value)} placeholder="Label" className={smallCls} />
                            <input type="text" value={link.url} onChange={e => updateNavLink(i, 'url', e.target.value)} placeholder="/page-url" className={smallCls} />
                            <button onClick={() => addNavChild(i)} className="p-1.5 text-slate-500 hover:text-primary transition-colors flex-shrink-0" title="Add submenu">
                              <Icon name="add" size={14} />
                            </button>
                            <button onClick={() => removeNavLink(i)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                              <Icon name="close" size={14} />
                            </button>
                          </div>
                          {link.children && link.children.length > 0 && (
                            <div className="mt-1.5 pl-4 space-y-1.5 border-l-2 border-[#1f1f1f]">
                              {link.children.map((child, ci) => (
                                <div key={ci} className="flex gap-2 items-center">
                                  <input type="text" value={child.label} onChange={e => updateNavChild(i, ci, 'label', e.target.value)} placeholder="Sub-label" className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded py-1 px-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50" />
                                  <input type="text" value={child.url} onChange={e => updateNavChild(i, ci, 'url', e.target.value)} placeholder="/sub-url" className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded py-1 px-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50" />
                                  <button onClick={() => removeNavChild(i, ci)} className="p-1 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"><Icon name="close" size={12} /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {header.navigation.length === 0 && (
                        <p className="text-slate-600 text-xs py-2">No custom nav links. Default category navigation will be used.</p>
                      )}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-400 text-xs font-medium">CTA Button</p>
                      {!header.ctaButton ? (
                        <button onClick={() => setHeader(h => ({ ...h, ctaButton: { text: '', url: '' } }))} className="text-xs text-primary hover:text-primary/80 font-medium">+ Add CTA</button>
                      ) : (
                        <button onClick={() => setHeader(h => ({ ...h, ctaButton: null }))} className="text-xs text-red-400 hover:text-red-300 font-medium">Remove</button>
                      )}
                    </div>
                    {header.ctaButton && (
                      <div className="flex gap-2">
                        <input type="text" value={header.ctaButton.text} onChange={e => setHeader(h => ({ ...h, ctaButton: { ...h.ctaButton!, text: e.target.value } }))} placeholder="Button Text" className={smallCls} />
                        <input type="text" value={header.ctaButton.url} onChange={e => setHeader(h => ({ ...h, ctaButton: { ...h.ctaButton!, url: e.target.value } }))} placeholder="/link-url" className={smallCls} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══ FOOTER TAB ═══ */}
              {activeTab === 'footer' && (
                <div className="space-y-4">
                  {/* Styling */}
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-2">Styling</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-slate-500 text-[10px] mb-1">Background Color</p>
                        <div className="flex gap-2">
                          <input type="color" value={footer.backgroundColor || '#0a0a0a'} onChange={e => setFooter(f => ({ ...f, backgroundColor: e.target.value }))} className="w-8 h-8 rounded border border-[#2a2a2a] bg-transparent cursor-pointer" />
                          <input type="text" value={footer.backgroundColor} onChange={e => setFooter(f => ({ ...f, backgroundColor: e.target.value }))} placeholder="Default" className={smallCls + ' text-xs'} />
                        </div>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] mb-1">Text Color</p>
                        <div className="flex gap-2">
                          <input type="color" value={footer.textColor || '#94a3b8'} onChange={e => setFooter(f => ({ ...f, textColor: e.target.value }))} className="w-8 h-8 rounded border border-[#2a2a2a] bg-transparent cursor-pointer" />
                          <input type="text" value={footer.textColor} onChange={e => setFooter(f => ({ ...f, textColor: e.target.value }))} placeholder="Default" className={smallCls + ' text-xs'} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-slate-500 text-[10px] mb-1">Padding</p>
                        <select value={footer.padding} onChange={e => setFooter(f => ({ ...f, padding: e.target.value as any }))} className={selectCls + ' w-full text-xs'}>
                          <option value="compact">Compact</option>
                          <option value="default">Default</option>
                          <option value="spacious">Spacious</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] mb-1">Column Gap</p>
                        <select value={footer.columnGap} onChange={e => setFooter(f => ({ ...f, columnGap: e.target.value as any }))} className={selectCls + ' w-full text-xs'}>
                          <option value="tight">Tight</option>
                          <option value="default">Default</option>
                          <option value="wide">Wide</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Logo & Branding */}
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-2">Logo & Branding</p>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">Logo Size:</span>
                        <select value={footer.logoSize || 'medium'} onChange={e => setFooter(f => ({ ...f, logoSize: e.target.value as any }))} className={selectCls + ' text-xs py-1'}>
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px] mb-1">Description (text under logo)</p>
                      <input type="text" value={footer.description || ''} onChange={e => setFooter(f => ({ ...f, description: e.target.value }))} placeholder="Text shown under the logo" className={inputCls} />
                    </div>
                  </div>

                  {/* Newsletter Toggle */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={footer.showNewsletter} onChange={e => setFooter(f => ({ ...f, showNewsletter: e.target.checked }))} className={checkCls} />
                      <span className="text-slate-300 text-sm">Show Newsletter</span>
                    </label>
                    {footer.showNewsletter && (
                      <input type="text" value={footer.newsletterTitle} onChange={e => setFooter(f => ({ ...f, newsletterTitle: e.target.value }))} placeholder="Newsletter title" className={smallCls + ' text-xs'} />
                    )}
                  </div>

                  {/* Copyright */}
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-2">Copyright Text</p>
                    <input type="text" value={footer.copyrightText} onChange={e => setFooter(f => ({ ...f, copyrightText: e.target.value }))} placeholder="Leave empty for default" className={inputCls} />
                  </div>

                  {/* Footer Columns */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-400 text-xs font-medium">Footer Columns ({footer.columns.length}/4)</p>
                      {footer.columns.length < 4 && (
                        <button onClick={addFooterColumn} className="text-xs text-primary hover:text-primary/80 font-medium">+ Add Column</button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {footer.columns.map((col, ci) => (
                        <div key={ci} className="bg-[#0e0e0e] border border-[#1f1f1f] rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <input type="text" value={col.title} onChange={e => updateColumnTitle(ci, e.target.value)} placeholder="Column Title" className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1.5 px-3 text-sm text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-primary/50" />
                            <button onClick={() => removeFooterColumn(ci)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"><Icon name="delete" size={16} /></button>
                          </div>
                          <div className="space-y-1.5">
                            {col.links.map((link, li) => (
                              <div key={li} className="flex gap-2 items-center">
                                <input type="text" value={link.label} onChange={e => updateColumnLink(ci, li, 'label', e.target.value)} placeholder="Label" className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded py-1 px-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50" />
                                <input type="text" value={link.url} onChange={e => updateColumnLink(ci, li, 'url', e.target.value)} placeholder="/url" className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded py-1 px-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50" />
                                <button onClick={() => removeColumnLink(ci, li)} className="p-1 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"><Icon name="close" size={14} /></button>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => addColumnLink(ci)} className="mt-2 text-xs text-primary hover:text-primary/80">+ Add Link</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Social Links */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-400 text-xs font-medium">Social Links</p>
                      <button onClick={addSocialLink} className="text-xs text-primary hover:text-primary/80 font-medium">+ Add Social</button>
                    </div>
                    <div className="space-y-2">
                      {footer.socialLinks.map((link, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <select value={link.platform} onChange={e => updateSocialLink(i, 'platform', e.target.value)} className={selectCls + ' text-xs'}>
                            {SOCIAL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <input type="text" value={link.url} onChange={e => updateSocialLink(i, 'url', e.target.value)} placeholder="https://..." className={smallCls} />
                          <button onClick={() => removeSocialLink(i)} className="p-2 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"><Icon name="close" size={16} /></button>
                        </div>
                      ))}
                      {footer.socialLinks.length === 0 && (
                        <p className="text-slate-600 text-xs py-1">No social links configured.</p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Bar Links */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-400 text-xs font-medium">Bottom Bar Links</p>
                      <button onClick={addBottomLink} className="text-xs text-primary hover:text-primary/80 font-medium">+ Add Link</button>
                    </div>
                    <div className="space-y-2">
                      {footer.bottomLinks.map((link, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input type="text" value={link.label} onChange={e => updateBottomLink(i, 'label', e.target.value)} placeholder="Label (e.g. Terms)" className={smallCls} />
                          <input type="text" value={link.url} onChange={e => updateBottomLink(i, 'url', e.target.value)} placeholder="/terms" className={smallCls} />
                          <button onClick={() => removeBottomLink(i)} className="p-2 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"><Icon name="close" size={16} /></button>
                        </div>
                      ))}
                      {footer.bottomLinks.length === 0 && (
                        <p className="text-slate-600 text-xs py-1">No custom bottom links. Default Terms/Privacy/Cookies will show.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="pt-2 border-t border-[#1f1f1f]">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 bg-primary text-black rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All Changes'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
