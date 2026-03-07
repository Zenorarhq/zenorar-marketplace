// Static component templates for the CMS page builder
// These define the available section types, their schemas (for auto-generating property forms), and default props

import { ComponentTemplate } from './api'

export const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  {
    id: 'tpl-design-block',
    name: 'design-block',
    category: 'content',
    description: 'Paste a full HTML+CSS design from Figma or Google Stitch',
    icon: 'code-block',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', title: 'Design Code', ui: 'code' },
        overrides: { type: 'string', title: 'Editable Elements', ui: 'element-editor', readFrom: 'code' },
        hideOnMobile: { type: 'boolean', title: 'Hide on Mobile' },
      },
    },
    defaultProps: { code: '', overrides: '{}' },
    thumbnail: null,
    order: 1,
    isActive: true,
  },
]
