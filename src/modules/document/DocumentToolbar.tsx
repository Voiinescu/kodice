import { useRef, useState } from 'react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Eraser,
  Heading as HeadingIcon,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Palette,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Underline,
  Undo2,
} from 'lucide-react'
import { ToolbarButton, ToolbarDivider, ToolbarGroupLabel } from '../../components/ui/ToolbarButton'
import { Menu, MenuItem, MenuLabel } from '../../components/ui/Menu'
import { Modal } from '../../components/ui/Modal'
import { BLOCK_LABELS } from './editor/editorCommands'
import type { DocumentEditor } from './types'
import { useToast } from '../../components/feedback/Toasts'

const TEXT_COLORS = [
  { name: 'Pizarra', hex: '#334155' },
  { name: 'Gris', hex: '#6b7280' },
  { name: 'Rojo', hex: '#dc2626' },
  { name: 'Naranja', hex: '#d97706' },
  { name: 'Verde', hex: '#059669' },
  { name: 'Azul', hex: '#0284c7' },
  { name: 'Índigo', hex: '#4f46e5' },
  { name: 'Violeta', hex: '#7c3aed' },
  { name: 'Rosa', hex: '#db2777' },
]

export function DocumentToolbar({ editor }: { editor: DocumentEditor }) {
  const { pushToast } = useToast()
  const [tableOpen, setTableOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)
  const [linkUrl, setLinkUrl] = useState('https://')
  const fileRef = useRef<HTMLInputElement>(null)

  const currentBlock = BLOCK_LABELS.find((b) => b.value === editor.toolbar.block)?.label ?? 'Párrafo'

  const onPickImage = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      pushToast('El archivo seleccionado no es una imagen.', 'error')
      return
    }
    editor.insertImage(file)
  }

  return (
    <div className="sticky top-14 z-20 flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur sm:px-3 dark:border-slate-800 dark:bg-slate-900/95">
      <ToolbarButton icon={<Undo2 className="h-4 w-4" />} label="Deshacer (Ctrl+Z)" onClick={editor.undo} disabled={!editor.canUndo} />
      <ToolbarButton icon={<Redo2 className="h-4 w-4" />} label="Rehacer (Ctrl+Shift+Z)" onClick={editor.redo} disabled={!editor.canRedo} />
      <ToolbarDivider />
      <ToolbarGroupLabel>Estilo</ToolbarGroupLabel>
      <Menu
        label="Bloque"
        trigger={
          <>
            <Pilcrow className="h-4 w-4" />
            <span className="hidden text-xs md:inline">{currentBlock}</span>
          </>
        }
      >
        {(close) => (
          <>
            <MenuLabel>Bloque de párrafo</MenuLabel>
            {BLOCK_LABELS.map((b) => (
              <MenuItem
                key={b.value}
                icon={b.value === 'h1' ? <HeadingIcon className="h-4 w-4" /> : b.value === 'p' ? <Pilcrow className="h-4 w-4" /> : undefined}
                active={editor.toolbar.block === b.value}
                onClick={() => {
                  editor.setBlock(b.value)
                  close()
                }}
              >
                {b.label}
              </MenuItem>
            ))}
          </>
        )}
      </Menu>

      <ToolbarButton
        icon={<Bold className="h-4 w-4" />}
        label="Negrita (Ctrl+B)"
        active={editor.toolbar.bold}
        onClick={() => editor.exec('bold')}
      />
      <ToolbarButton
        icon={<Italic className="h-4 w-4" />}
        label="Cursiva (Ctrl+I)"
        active={editor.toolbar.italic}
        onClick={() => editor.exec('italic')}
      />
      <ToolbarButton
        icon={<Underline className="h-4 w-4" />}
        label="Subrayado (Ctrl+U)"
        active={editor.toolbar.underline}
        onClick={() => editor.exec('underline')}
      />
      <ToolbarButton
        icon={<Strikethrough className="h-4 w-4" />}
        label="Tachado"
        active={editor.toolbar.strike}
        onClick={() => editor.exec('strikeThrough')}
      />
      <ToolbarDivider />

      <ToolbarGroupLabel>Color</ToolbarGroupLabel>
      <Menu
        label="Color de texto"
        trigger={
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 dark:border-slate-600">
            <Palette className="h-3.5 w-3.5 text-slate-500" />
          </span>
        }
      >
        {(close) => (
          <>
            <MenuLabel>Color de texto</MenuLabel>
            <div className="grid grid-cols-5 gap-1.5 p-2">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  title={c.name}
                  onClick={() => {
                    editor.setColor(c.hex)
                    close()
                  }}
                  className="h-7 w-7 rounded-md border border-slate-200 transition-transform hover:scale-110 dark:border-slate-600"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </>
        )}
      </Menu>
      <Menu
        label="Color de resaltado"
        trigger={
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-yellow-200 dark:border-slate-600">
            <span className="text-[10px] font-bold text-yellow-800">A</span>
          </span>
        }
      >
        {(close) => (
          <>
            <MenuLabel>Resaltado</MenuLabel>
            <div className="grid grid-cols-5 gap-1.5 p-2">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  title={c.name}
                  onClick={() => {
                    editor.setHighlight(c.hex)
                    close()
                  }}
                  className="h-7 w-7 rounded-md border border-slate-200 transition-transform hover:scale-110 dark:border-slate-600"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            <MenuItem
              onClick={() => {
                editor.setHighlight('transparent')
                close()
              }}
            >
              Sin resaltado
            </MenuItem>
          </>
        )}
      </Menu>
      <ToolbarDivider />

      <ToolbarGroupLabel>Párrafo</ToolbarGroupLabel>
      <ToolbarButton
        icon={<AlignLeft className="h-4 w-4" />}
        label="Alinear a la izquierda"
        active={editor.toolbar.align === 'left'}
        onClick={() => editor.setAlign('left')}
      />
      <ToolbarButton
        icon={<AlignCenter className="h-4 w-4" />}
        label="Centrar"
        active={editor.toolbar.align === 'center'}
        onClick={() => editor.setAlign('center')}
      />
      <ToolbarButton
        icon={<AlignRight className="h-4 w-4" />}
        label="Alinear a la derecha"
        active={editor.toolbar.align === 'right'}
        onClick={() => editor.setAlign('right')}
      />
      <ToolbarButton
        icon={<AlignJustify className="h-4 w-4" />}
        label="Justificar"
        active={editor.toolbar.align === 'justify'}
        onClick={() => editor.setAlign('justify')}
      />
      <ToolbarButton
        icon={<List className="h-4 w-4" />}
        label="Lista con viñetas"
        active={editor.toolbar.unorderedList}
        onClick={() => editor.toggleList(false)}
      />
      <ToolbarButton
        icon={<ListOrdered className="h-4 w-4" />}
        label="Lista numerada"
        active={editor.toolbar.orderedList}
        onClick={() => editor.toggleList(true)}
      />
      <ToolbarButton
        icon={<Quote className="h-4 w-4" />}
        label="Cita"
        active={editor.toolbar.blockquote}
        onClick={() => editor.setBlock('blockquote')}
      />
      <ToolbarButton
        icon={<Code className="h-4 w-4" />}
        label="Código"
        active={editor.toolbar.code}
        onClick={() => editor.setBlock('pre')}
      />
      <ToolbarDivider />

      <ToolbarGroupLabel>Insertar</ToolbarGroupLabel>
      <ToolbarButton icon={<ImageIcon className="h-4 w-4" />} label="Insertar imagen" onClick={() => fileRef.current?.click()} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          onPickImage(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <ToolbarButton icon={<Table2 className="h-4 w-4" />} label="Insertar tabla" onClick={() => setTableOpen(true)} />
      <ToolbarButton icon={<Link2 className="h-4 w-4" />} label="Insertar enlace" onClick={() => setLinkOpen(true)} />
      <ToolbarButton icon={<Eraser className="h-4 w-4" />} label="Quitar formato" onClick={editor.clearFormatting} />
      <ToolbarDivider />

      {tableOpen && (
        <Modal title="Insertar tabla" onClose={() => setTableOpen(false)}>
          <div className="flex items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Filas
              <input
                type="number"
                min={1}
                max={30}
                value={tableRows}
                onChange={(e) => setTableRows(Math.max(1, Math.min(30, Number(e.target.value))))}
                className="w-24 rounded-md border border-slate-200 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Columnas
              <input
                type="number"
                min={1}
                max={12}
                value={tableCols}
                onChange={(e) => setTableCols(Math.max(1, Math.min(12, Number(e.target.value))))}
                className="w-24 rounded-md border border-slate-200 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700"
              />
            </label>
            <button
              className="rounded-md bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700"
              onClick={() => {
                editor.insertTable(tableRows, tableCols)
                setTableOpen(false)
              }}
            >
              Insertar
            </button>
          </div>
        </Modal>
      )}

      {linkOpen && (
        <Modal title="Insertar enlace" onClose={() => setLinkOpen(false)}>
          <label className="flex flex-col gap-1.5 text-sm">
            URL
            <input
              autoFocus
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  editor.insertLink(linkUrl)
                  setLinkOpen(false)
                }
              }}
              placeholder="https://ejemplo.com"
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 dark:border-slate-600 dark:bg-slate-700"
            />
          </label>
          <div className="mt-3 flex justify-end gap-2">
            <button
              className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => setLinkOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="rounded-md bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700"
              onClick={() => {
                editor.insertLink(linkUrl)
                setLinkOpen(false)
              }}
            >
              Aplicar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}