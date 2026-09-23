import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FilePlus2,
  FileText,
  Grid3x3,
  Moon,
  Sheet,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react'
import { createId } from '../utils/id'
import { getFileMeta, removeFile, saveFile, usageBytes } from '../utils/storage'
import { LOCAL_STORAGE_LIMIT_BYTES, formatBytes } from '../utils/formatBytes'
import { formatRelativeTime } from '../utils/date'
import { useTheme } from '../components/ThemeProvider'
import { Modal } from '../components/ui/Modal'
import { createEmptyDocument, createSampleDocument } from '../modules/document/defaults'
import { createEmptySpreadsheet, createSampleSpreadsheet } from '../modules/spreadsheet/defaults'
import type { DocumentFile, FileMeta, SpreadsheetFile } from '../types/file'
import { useToast } from '../components/feedback/Toasts'

/** Pantalla de inicio: elegir módulo, plantillas y archivos recientes. */
export default function Launcher() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { pushToast } = useToast()
  const [files, setFiles] = useState<FileMeta[]>(() => getFileMeta())
  const [toDelete, setToDelete] = useState<FileMeta | null>(null)
  const usage = usageBytes()

  const openFile = (meta: FileMeta) => {
    navigate(meta.type === 'document' ? `/document/${meta.id}` : `/spreadsheet/${meta.id}`)
  }

  const newDocument = (sample = false) => {
    const now = Date.now()
    const doc: DocumentFile = {
      ...(sample ? createSampleDocument() : createEmptyDocument()),
      id: createId('doc'),
      type: 'document',
      name: sample ? 'Plantilla de ejemplo' : 'Documento sin título',
      createdAt: now,
      updatedAt: now,
    }
    saveFile(doc)
    setFiles(getFileMeta())
    navigate(`/document/${doc.id}`)
  }

  const newSpreadsheet = (sample = false) => {
    const now = Date.now()
    const sheet: SpreadsheetFile = {
      ...(sample ? createSampleSpreadsheet() : createEmptySpreadsheet()),
      id: createId('sheet'),
      type: 'spreadsheet',
      name: sample ? 'Hoja de ejemplo' : 'Hoja de cálculo sin título',
      createdAt: now,
      updatedAt: now,
    }
    saveFile(sheet)
    setFiles(getFileMeta())
    navigate(`/spreadsheet/${sheet.id}`)
  }

  const handleDelete = () => {
    if (!toDelete) return
    removeFile(toDelete.id)
    setFiles(getFileMeta())
    setToDelete(null)
    pushToast('Archivo eliminado.')
  }

  return (
    <div className="min-h-full">
      {/* Barra superior */}
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-600 text-white shadow-sm">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">Folio</h1>
            <p className="text-xs text-slate-400">Suite ofimática ligera</p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          aria-label="Cambiar tema"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        {/* Hero */}
        <section className="py-8 text-center sm:py-12">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-accent-100 bg-accent-50 px-3 py-1 text-xs font-medium text-accent-700 dark:border-accent-500/20 dark:bg-accent-500/10 dark:text-accent-300">
            <Sparkles className="h-3.5 w-3.5" />
            Todo se guarda en tu navegador, sin cuenta ni conexión
          </p>
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
            Documentos y hojas de cálculo,
            <br />
            <span className="bg-gradient-to-r from-accent-600 to-indigo-400 bg-clip-text text-transparent">
              sencillos y elegantes.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Un editor de texto WYSIWYG y una hoja de cálculo con fórmulas reales.
            Sin dependencias de servidor: cada archivo vive en tu dispositivo.
          </p>
        </section>

        {/* Módulos */}
        <section className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => newDocument()}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-pop dark:border-slate-800 dark:bg-slate-900 dark:hover:border-accent-600/50"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-accent-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <FilePlus2 className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Documento</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Editor de texto enriquecido con formato, tablas, imágenes y exportación a Word o PDF.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-600 dark:text-accent-300">
              Nuevo documento
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </button>

          <button
            onClick={() => newSpreadsheet()}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-pop dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-600/50"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Grid3x3 className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Hoja de cálculo</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Grid con fórmulas (SUMAR, PROMEDIO, SI…), formato de celdas, ordenar, filtrar y exportar a Excel.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-300">
              Nueva hoja
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </button>
        </section>

        {/* Plantillas */}
        <section className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => newDocument(true)}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-accent-600 dark:hover:text-accent-300"
          >
            Plantilla de documento de ejemplo
          </button>
          <button
            onClick={() => newSpreadsheet(true)}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:text-emerald-300"
          >
            Hoja de ejemplo con fórmulas
          </button>
        </section>

        {/* Recientes */}
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Recientes
          </h2>
          {files.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
              <Sheet className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aún no hay archivos. Crea un documento o una hoja de cálculo para empezar.
              </p>
            </div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {files.map((meta) => (
                <li key={meta.id}>
                  <div className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card transition-all hover:border-accent-300 hover:shadow-pop dark:border-slate-800 dark:bg-slate-900 dark:hover:border-accent-600/50">
                    <button
                      onClick={() => openFile(meta)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          meta.type === 'document'
                            ? 'bg-indigo-50 text-accent-600 dark:bg-indigo-500/10 dark:text-indigo-300'
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
                        }`}
                      >
                        {meta.type === 'document' ? (
                          <FileText className="h-4.5 w-4.5" aria-hidden />
                        ) : (
                          <Grid3x3 className="h-4.5 w-4.5" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                          {meta.name}
                        </span>
                        <span className="block text-xs text-slate-400">
                          {meta.type === 'document' ? 'Documento' : 'Hoja de cálculo'} ·{' '}
                          {formatRelativeTime(meta.updatedAt)}
                        </span>
                      </span>
                    </button>
                    <button
                      onClick={() => setToDelete(meta)}
                      aria-label={`Eliminar ${meta.name}`}
                      className="rounded-md p-1.5 text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-slate-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Almacenamiento */}
        <section className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <span>
            Almacenamiento local: {formatBytes(usage)} de {formatBytes(LOCAL_STORAGE_LIMIT_BYTES)}
          </span>
        </section>
      </main>

      {toDelete && (
        <Modal title="Eliminar archivo" onClose={() => setToDelete(null)} width="max-w-sm">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ¿Seguro que quieres eliminar <strong>{toDelete.name}</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={() => setToDelete(null)}
            >
              Cancelar
            </button>
            <button
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              onClick={handleDelete}
            >
              Eliminar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}