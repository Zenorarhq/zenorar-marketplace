'use client'

import { Section } from '@/lib/cms/api'
import HeroSection from './HeroSection'
import FeaturesGridSection from './FeaturesGridSection'
import CtaBannerSection from './CtaBannerSection'
import TestimonialsSection from './TestimonialsSection'
import TextBlockSection from './TextBlockSection'
import ImageSection from './ImageSection'
import ImageGallerySection from './ImageGallerySection'
import ProductShowcaseSection from './ProductShowcaseSection'
import CategoryGridSection from './CategoryGridSection'
import PricingTableSection from './PricingTableSection'
import SectionContainer from './SectionContainer'
import ColumnSection from './ColumnSection'
import SpacerSection from './SpacerSection'
import DividerSection from './DividerSection'
import HeaderSection from './HeaderSection'
import FooterSection from './FooterSection'
import VideoEmbedSection from './VideoEmbedSection'
import ButtonCtaSection from './ButtonCtaSection'
import FaqAccordionSection from './FaqAccordionSection'
import CustomHtmlSection from './CustomHtmlSection'
import DesignBlockSection from './DesignBlockSection'
import SocialLinksSection from './SocialLinksSection'
import NewsletterSection from './NewsletterSection'
import StatsCounterSection from './StatsCounterSection'
import MapSection from './MapSection'
import HeadingSection from './HeadingSection'
import IconSection from './IconSection'
import IconBoxSection from './IconBoxSection'
import ImageBoxSection from './ImageBoxSection'
import IconListSection from './IconListSection'
import TabsSection from './TabsSection'
import CountdownSection from './CountdownSection'
import ProgressBarSection from './ProgressBarSection'
import StarRatingSection from './StarRatingSection'
import AlertSection from './AlertSection'

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
  'hero': HeroSection,
  'features-grid': FeaturesGridSection,
  'cta-banner': CtaBannerSection,
  'testimonials': TestimonialsSection,
  'text-block': TextBlockSection,
  'image': ImageSection,
  'image-gallery': ImageGallerySection,
  'product-showcase': ProductShowcaseSection,
  'category-grid': CategoryGridSection,
  'pricing-table': PricingTableSection,
  'spacer': SpacerSection,
  'divider': DividerSection,
  'header': HeaderSection,
  'footer': FooterSection,
  'video-embed': VideoEmbedSection,
  'button-cta': ButtonCtaSection,
  'faq-accordion': FaqAccordionSection,
  'custom-html': CustomHtmlSection,
  'design-block': DesignBlockSection,
  'social-links': SocialLinksSection,
  'newsletter': NewsletterSection,
  'stats-counter': StatsCounterSection,
  'map': MapSection,
  'heading': HeadingSection,
  'icon': IconSection,
  'icon-box': IconBoxSection,
  'image-box': ImageBoxSection,
  'icon-list': IconListSection,
  'tabs': TabsSection,
  'countdown': CountdownSection,
  'progress-bar': ProgressBarSection,
  'star-rating': StarRatingSection,
  'alert': AlertSection,
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
  HeroSection,
  FeaturesGridSection,
  CtaBannerSection,
  TestimonialsSection,
  TextBlockSection,
  ImageSection,
  ImageGallerySection,
  ProductShowcaseSection,
  CategoryGridSection,
  PricingTableSection,
  SectionContainer,
  ColumnSection,
  SpacerSection,
  DividerSection,
  HeaderSection,
  FooterSection,
  VideoEmbedSection,
  ButtonCtaSection,
  FaqAccordionSection,
  CustomHtmlSection,
  DesignBlockSection,
  SocialLinksSection,
  NewsletterSection,
  StatsCounterSection,
  MapSection,
  HeadingSection,
  IconSection,
  IconBoxSection,
  ImageBoxSection,
  IconListSection,
  TabsSection,
  CountdownSection,
  ProgressBarSection,
  StarRatingSection,
  AlertSection,
}
