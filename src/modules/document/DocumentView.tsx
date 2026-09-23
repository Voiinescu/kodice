import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { DocumentFile } from '../../types/file'
import { getFile, saveFile } from '../../utils/storage'
import { downloadString, sanitizeFileName } from '../../utils/download'
import { WorkspaceHeader } from '../../components/WorkspaceHeader'
import { MenuDivider, MenuItem, MenuLabel } from '../../components/ui/Menu'
import { useToast } from '../../components/feedback/Toasts'
import { useDocumentEditor } from './editor/useDocumentEditor'
import { DocumentToolbar } from './DocumentToolbar'
import { exportDocumentDocx } from './export/exportDocx'
import { exportDocumentPdf } from './export/exportPdf'
import { countCharacters, countWords } from './editor/htmlStats'

function loadDocument(id: string): DocumentFile | null {
  const record = getFile(id)
  return record && record.type === 'document' ? record : null
}

/**
 * Vista del módulo Documento.
 * La capa de datos (persistencia, nombre, cabecera) vive aquí; el editor
 * (hook + toolbar + superficie) se monta en <EditorPane>, que se remonta
 * con reloadKey al importar un JSON para reiniciar el historial.
 */
export default function DocumentView() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { pushToast } = useToast()

  const [file, setFile] = useState<DocumentFile | null>(() => loadDocument(id))
  const [html, setHtml] = useState<string>(() => file?.html ?? '')
  const [saveState, setSaveState] = useState<'saving' | 'saved'>('saved')
  const [lastSavedAt, setLastSavedAt] = useState<number>(() => file?.updatedAt ?? Date.now())
  const [reloadKey, setReloadKey] = useState(0)

  const latest = useRef<{ file: DocumentFile | null; html: string }>({ file, html })
  latest.current = { file, html }

  useEffect(() => {
    if (!file) {
      pushToast('El documento no existe o fue eliminado.', 'error')
      navigate('/', { replace: true })
    }
  }, [file, navigate, pushToast])

  const persist = useMemo(() => {
    return () => {
      const { file: f, html: h } = latest.current
      if (!f) return
      const next: DocumentFile = { ...f, html: h, updatedAt: Date.now() }
      saveFile(next)
      setFile((prev) => (prev && prev.id === f.id ? next : prev))
      setLastSavedAt(next.updatedAt)
      setSaveState('saved')
    }
  }, [])

  // Autoguardado diferido; se fuerza guardado inmediato al desmontar/ocultar.
  useEffect(() => {
    if (!file) return
    setSaveState('saving')
    const timeout = setTimeout(persist, 600)
    const flush = () => persist()
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', flush)
    return () => {
      clearTimeout(timeout)
      flush()
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', flush)
    }
  }, [file, html, reloadKey, persist])

  const onHtmlChange = (nextHtml: string) => {
    setHtml(nextHtml)
    setSaveState('saving')
  }

  const rename = (name: string) => {
    if (!file) return
    setFile({ ...file, name: name.trim() || 'Sin título' })
    setSaveState('saving')
  }

  const exportJson = () => {
    if (!file) return
    downloadString(
      JSON.stringify({ ...file, html }, null, 2),
      `${sanitizeFileName(file.name)}.json`,
      'application/json',
    )
    pushToast('Documento exportado en formato JSON.')
  }

  const importJson = async (list: FileList | null) => {
    const input = list?.[0]
    if (!input) return
    try {
      const raw = await input.text()
      const parsed: unknown = JSON.parse(raw)
      const candidate = (parsed ?? {}) as Partial<DocumentFile>
      if (typeof candidate.html !== 'string') {
        pushToast('El archivo JSON no contiene un documento de Folio.', 'error')
        return
      }
      if (!file) return
      setFile({
        ...file,
        name: typeof candidate.name === 'string' && candidate.name ? candidate.name : file.name,
        html: candidate.html,
        updatedAt: Date.now(),
      })
      setReloadKey((k) => k + 1)
      pushToast('Documento importado correctamente.')
    } catch {
      pushToast('No se pudo leer el archivo JSON.', 'error')
    }
  }

  const words = useMemo(() => countWords(html), [html])
  const chars = useMemo(() => countCharacters(html), [html])

  if (!file) return null

  const exportActions = (close: () => void) => (
    <>
      <MenuLabel>Formato</MenuLabel>
      <MenuItem
        onClick={async () => {
          close()
          try {
            await exportDocumentDocx(file.name, html)
            pushToast('Exportado como .docx.')
          } catch {
            pushToast('No se pudo exportar el .docx.', 'error')
          }
        }}
      >
        Documento Word (.docx)
      </MenuItem>
      <MenuItem
        onClick={() => {
          close()
          exportDocumentPdf(file.name, html)
        }}
      >
        PDF (imprimir a PDF)
      </MenuItem>
      <MenuItem onClick={exportJson}>Documento Folio (.json)</MenuItem>
      <MenuDivider />
      <MenuLabel>Recuperar</MenuLabel>
      <MenuItem onClick={() => document.getElementById('folio-import-json')?.click()}>
        Importar desde JSON…
      </MenuItem>
      <input
        id="folio-import-json"
        type="file"
        accept="application/json"
        className="sr-only"
        onChange={(e) => importJson(e.target.files)}
      />
    </>
  )

  return (
    <div className="flex h-full flex-col">
      <WorkspaceHeader
        title={file.name}
        onTitleChange={rename}
        fileType="document"
        saveState={saveState}
        lastSavedAt={lastSavedAt}
        exportActions={exportActions}
      />
      <EditorPane key={reloadKey} file={file} onHtmlChange={onHtmlChange} />
      <footer className="sticky bottom-0 flex items-center gap-4 border-t border-slate-200 bg-white/90 px-4 py-1.5 text-xs text-slate-400 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <span>{words} palabras</span>
        <span>{chars} caracteres</span>
        <span className="hidden sm:inline">Ctrl+Z deshacer · Ctrl+Shift+Z rehacer</span>
      </footer>
    </div>
  )
}

/** Capa del editor: monta hook + barra + superficie. La clave externa la reinicia. */
function EditorPane({
  file,
  onHtmlChange,
}: {
  file: DocumentFile
  onHtmlChange: (html: string) => void
}) {
  const initialHtmlRef = useRef(file.html)
  const editor = useDocumentEditor(initialHtmlRef.current, { onHtmlChange })

  return (
    <>
      <DocumentToolbar editor={editor} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-3 pb-32 pt-6 sm:px-6">
          <div className="min-h-[70vh] rounded-xl border border-slate-200 bg-white px-5 py-8 shadow-card sm:px-10 md:px-14 dark:border-slate-800 dark:bg-slate-900">
            <div
              ref={editor.editorRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label="Documento"
              spellCheck
              onKeyDown={editor.onKeyDown}
              onInput={editor.onInput}
              className="doc-content min-h-[68vh] focus:outline-none"
            />
          </div>
        </div>
      </main>
    </>
  )
}