'use client'

interface CustomHtmlSectionProps {
  props: {
    html?: string
  }
}

export default function CustomHtmlSection({ props }: CustomHtmlSectionProps) {
  const { html } = props

  if (!html) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto bg-[#141414] border border-[#1f1f1f] rounded-xl p-8 text-center">
          <p className="text-slate-500">Add HTML code to render custom content.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-4 px-4">
      <div className="max-w-6xl mx-auto" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
