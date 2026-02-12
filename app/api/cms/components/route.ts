import { NextResponse } from 'next/server'
import { COMPONENT_TEMPLATES } from '@/lib/cms/component-templates'

// GET /api/cms/components - Return static component templates
export async function GET() {
  return NextResponse.json({ success: true, data: COMPONENT_TEMPLATES })
}
