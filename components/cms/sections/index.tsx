'use client'

import { Section } from '@/lib/cms/api'
import DesignBlockSection from './DesignBlockSection'
import SectionContainer from './SectionContainer'
import ColumnSection from './ColumnSection'

interface SectionRendererProps {
  section: Section
  isEditing?: boolean
}

// Container types that can have children
const containerTypes = ['section', 'column']

// Components that accept children prop
interface ContainerComponentProps {
  props: Record<string, any>
  children?: React.ReactNode
}

// Regular components without children
interface LeafComponentProps {
  props: Record<string, any>
}

const leafComponents: Record<string, React.ComponentType<LeafComponentProps>> = {
  'design-block': DesignBlockSection,
}

const containerComponents: Record<string, React.ComponentType<ContainerComponentProps>> = {
  'section': SectionContainer,
  'column': ColumnSection,
}

// Universal margin classes applied at renderer level so all components get margin support
const marginClasses: Record<string, string> = {
  none: '',
  small: 'my-2',
  medium: 'my-4',
  large: 'my-8',
}

export default function SectionRenderer({ section, isEditing }: SectionRendererProps) {
  const isContainer = containerTypes.includes(section.type)
  const margin = section.props?.margin as string | undefined
  const marginClass = margin && marginClasses[margin] ? marginClasses[margin] : ''

  // Handle container components (can have children)
  if (isContainer) {
    const ContainerComponent = containerComponents[section.type]
    if (!ContainerComponent) {
      return (
        <div className="py-8 px-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg my-4">
          <p className="text-yellow-500 text-center">
            Unknown container type: <code className="bg-yellow-500/20 px-2 py-1 rounded">{section.type}</code>
          </p>
        </div>
      )
    }

    // Recursively render children
    const children = section.children && section.children.length > 0 ? (
      <>
        {[...section.children]
          .sort((a, b) => a.order - b.order)
          .map((child) => (
            <SectionRenderer key={child.id} section={child} isEditing={isEditing} />
          ))}
      </>
    ) : null

    return (
      <div className={marginClass || undefined}>
        <ContainerComponent props={section.props}>{children}</ContainerComponent>
      </div>
    )
  }

  // Handle leaf components (no children)
  const LeafComponent = leafComponents[section.type]
  if (!LeafComponent) {
    return (
      <div className="py-8 px-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg my-4">
        <p className="text-yellow-500 text-center">
          Unknown section type: <code className="bg-yellow-500/20 px-2 py-1 rounded">{section.type}</code>
        </p>
      </div>
    )
  }

  return (
    <div className={marginClass || undefined}>
      <LeafComponent props={section.props} />
    </div>
  )
}

export {
  DesignBlockSection,
  SectionContainer,
  ColumnSection,
}
