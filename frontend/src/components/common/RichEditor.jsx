import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Code, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight, Image as ImageIcon,
  Heading1, Heading2, Heading3, Minus, Highlighter
} from 'lucide-react'

function ToolbarButton({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? 'is-active' : ''}
      title={title}
    >
      {children}
    </button>
  )
}

export default function RichEditor({ content, onChange, placeholder = 'Escribe aquí...' }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange && onChange(editor.getHTML())
    },
  })

  if (!editor) return null

  const addImage = () => {
    const url = window.prompt('URL de la imagen:')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  const addLink = () => {
    const url = window.prompt('URL del enlace:')
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    } else {
      editor.chain().focus().unsetLink().run()
    }
  }

  return (
    <div className="tiptap-editor">
      <div className="tiptap-toolbar">
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })} title="Título 1">
          <Heading1 size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })} title="Título 2">
          <Heading2 size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })} title="Título 3">
          <Heading3 size={14} />
        </ToolbarButton>

        <span style={{ width: 1, background: 'var(--border)', margin: '0 2px' }} />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')} title="Negrita">
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')} title="Cursiva">
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')} title="Subrayado">
          <UnderlineIcon size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')} title="Tachado">
          <Strikethrough size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive('highlight')} title="Resaltado">
          <Highlighter size={14} />
        </ToolbarButton>

        <span style={{ width: 1, background: 'var(--border)', margin: '0 2px' }} />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')} title="Lista">
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')} title="Lista numerada">
          <ListOrdered size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')} title="Cita">
          <Quote size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')} title="Código">
          <Code size={14} />
        </ToolbarButton>

        <span style={{ width: 1, background: 'var(--border)', margin: '0 2px' }} />

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })} title="Izquierda">
          <AlignLeft size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })} title="Centrado">
          <AlignCenter size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })} title="Derecha">
          <AlignRight size={14} />
        </ToolbarButton>

        <span style={{ width: 1, background: 'var(--border)', margin: '0 2px' }} />

        <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Enlace">
          <LinkIcon size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="Imagen">
          <ImageIcon size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Separador">
          <Minus size={14} />
        </ToolbarButton>
      </div>
      <div className="tiptap-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
