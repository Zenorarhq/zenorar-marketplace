'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapImage from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { useState, useCallback, useEffect, useRef } from 'react'
import Icon from '@/components/ui/Icon'
import MediaPickerModal from './MediaPickerModal'
import { MediaFile } from '@/lib/api/media'

// Extend Image extension with alignment attribute
const AlignableImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-align': {
        default: 'center',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes: Record<string, string>) => {
          return { 'data-align': attributes['data-align'] || 'center' }
        },
      },
    }
  },
})

interface BlogEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function BlogEditor({ content, onChange, placeholder = 'Start writing your blog post...' }: BlogEditorProps) {
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [imageToolbar, setImageToolbar] = useState<{ top: number; left: number } | null>(null)
  const editorWrapperRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      AlignableImage.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[400px] focus:outline-none px-4 py-3',
      },
    },
    onSelectionUpdate: ({ editor }) => {
      if (editor.isActive('image') && editorWrapperRef.current) {
        // Find the selected image element and position toolbar above it
        const imgEl = editorWrapperRef.current.querySelector('img.ProseMirror-selectednode') as HTMLElement
        if (imgEl) {
          const wrapperRect = editorWrapperRef.current.getBoundingClientRect()
          const imgRect = imgEl.getBoundingClientRect()
          setImageToolbar({
            top: imgRect.top - wrapperRect.top - 44,
            left: imgRect.left - wrapperRect.left + imgRect.width / 2 - 60,
          })
          return
        }
      }
      setImageToolbar(null)
    },
  })

  // Sync external content changes (e.g. loading existing post)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleImageSelect = useCallback((file: MediaFile) => {
    if (editor) {
      editor.chain().focus().setImage({ src: file.url, alt: file.alt || file.name }).run()
    }
    setShowMediaPicker(false)
  }, [editor])

  const setImageAlign = useCallback((align: string) => {
    if (!editor) return
    editor.chain().focus().updateAttributes('image', { 'data-align': align }).run()
  }, [editor])

  const setLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Enter URL', previousUrl || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  const currentAlign = editor.isActive('image') ? (editor.getAttributes('image')['data-align'] || 'center') : null

  return (
    <div ref={editorWrapperRef} className="border border-[#2a2a2a] rounded-xl overflow-hidden bg-[#1a1a1a] relative">
      {/* Floating image alignment toolbar */}
      {imageToolbar && currentAlign && (
        <div
          className="absolute z-10 flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-1 shadow-xl"
          style={{ top: imageToolbar.top, left: imageToolbar.left }}
        >
          <ToolbarButton onClick={() => setImageAlign('left')} active={currentAlign === 'left'} title="Float Left">
            <Icon name="text-align-left" size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => setImageAlign('center')} active={currentAlign === 'center'} title="Full Width">
            <Icon name="text-align-center" size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => setImageAlign('right')} active={currentAlign === 'right'} title="Float Right">
            <Icon name="text-align-right" size={14} />
          </ToolbarButton>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-[#2a2a2a] bg-[#141414]">
        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <span className="font-bold text-sm">B</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <span className="italic text-sm">I</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <span className="line-through text-sm">S</span>
        </ToolbarButton>

        <div className="w-px h-5 bg-[#2a2a2a] mx-1" />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <span className="text-sm font-semibold">H2</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <span className="text-sm font-semibold">H3</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          active={editor.isActive('heading', { level: 4 })}
          title="Heading 4"
        >
          <span className="text-sm font-semibold">H4</span>
        </ToolbarButton>

        <div className="w-px h-5 bg-[#2a2a2a] mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <Icon name="unordered-list" size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <Icon name="ordered-list" size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Icon name="quote-down" size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-[#2a2a2a] mx-1" />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <Icon name="text-align-left" size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <Icon name="text-align-center" size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <Icon name="text-align-right" size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-[#2a2a2a] mx-1" />

        {/* Link & Image */}
        <ToolbarButton
          onClick={setLink}
          active={editor.isActive('link')}
          title="Add Link"
        >
          <Icon name="link-01" size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setShowMediaPicker(true)}
          title="Insert Image"
        >
          <Icon name="image-01" size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-[#2a2a2a] mx-1" />

        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Icon name="undo" size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Icon name="redo" size={16} />
        </ToolbarButton>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Media picker modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleImageSelect}
        allowedTypes={['image']}
        title="Insert Image"
      />
    </div>
  )
}

function ToolbarButton({ children, onClick, active, disabled, title }: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-primary/20 text-primary'
          : disabled
            ? 'text-slate-600 cursor-not-allowed'
            : 'text-slate-400 hover:text-white hover:bg-[#2a2a2a]'
      }`}
    >
      {children}
    </button>
  )
}
