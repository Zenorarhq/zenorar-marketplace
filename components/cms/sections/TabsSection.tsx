'use client'

import { useState } from 'react'

interface TabItem {
  title?: string
  content?: string
  icon?: string
}

interface TabsSectionProps {
  props: {
    tabs?: TabItem[]
    defaultTab?: number
    tabPosition?: 'top' | 'left'
    tabAlignment?: 'left' | 'center' | 'right' | 'stretch'
    activeColor?: string
    activeTextColor?: string
    inactiveColor?: string
    inactiveTextColor?: string
    contentBackgroundColor?: string
    borderRadius?: 'none' | 'small' | 'medium' | 'large'
    backgroundColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    customClassName?: string
    hideOnMobile?: boolean
  }
}

export default function TabsSection({ props }: TabsSectionProps) {
  const {
    tabs = [{ title: 'Tab 1', content: 'Content for tab 1' }, { title: 'Tab 2', content: 'Content for tab 2' }, { title: 'Tab 3', content: 'Content for tab 3' }],
    defaultTab = 0,
    tabPosition = 'top',
    tabAlignment = 'left',
    activeColor,
    activeTextColor,
    inactiveColor,
    inactiveTextColor,
    contentBackgroundColor,
    borderRadius = 'small',
    backgroundColor,
    padding = 'medium',
    customClassName,
    hideOnMobile,
  } = props

  const [activeTab, setActiveTab] = useState(defaultTab)

  const borderRadiusClasses: Record<string, string> = {
    none: 'rounded-none',
    small: 'rounded-md',
    medium: 'rounded-lg',
    large: 'rounded-xl',
  }

  const paddingClasses: Record<string, string> = {
    none: '',
    small: 'py-4 px-4',
    medium: 'py-8 px-4',
    large: 'py-12 px-4',
  }

  const tabAlignmentClasses: Record<string, string> = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    stretch: '',
  }

  if (!tabs || tabs.length === 0) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto bg-[#141414] border border-[#1f1f1f] rounded-xl p-8 text-center">
          <p className="text-slate-500">Add tabs to display tabbed content.</p>
        </div>
      </div>
    )
  }

  const safeActiveTab = Math.min(activeTab, tabs.length - 1)

  const tabButtons = (
    <div
      className={`flex ${tabPosition === 'left' ? 'flex-col' : `flex-row ${tabAlignmentClasses[tabAlignment]}`} gap-1`}
    >
      {tabs.map((tab, index) => {
        const isActive = index === safeActiveTab
        return (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${borderRadiusClasses[borderRadius]} ${tabAlignment === 'stretch' && tabPosition === 'top' ? 'flex-1' : ''}`}
            style={{
              backgroundColor: isActive ? (activeColor || '#2563eb') : (inactiveColor || '#1a1a1a'),
              color: isActive ? (activeTextColor || '#ffffff') : (inactiveTextColor || '#94a3b8'),
            }}
          >
            {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
            {tab.title}
          </button>
        )
      })}
    </div>
  )

  const contentPanel = (
    <div
      className={`p-5 ${borderRadiusClasses[borderRadius]} text-slate-300 text-sm leading-relaxed`}
      style={{ backgroundColor: contentBackgroundColor || '#141414' }}
    >
      {tabs[safeActiveTab]?.content}
    </div>
  )

  return (
    <div
      className={`${paddingClasses[padding]} ${hideOnMobile ? 'hidden md:block' : ''} ${customClassName || ''}`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      <div className={`max-w-4xl mx-auto flex ${tabPosition === 'left' ? 'flex-col md:flex-row' : 'flex-col'} gap-2`}>
        {tabButtons}
        <div className="flex-1">{contentPanel}</div>
      </div>
    </div>
  )
}