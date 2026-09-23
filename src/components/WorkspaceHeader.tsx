import type { ReactNode } from 'react'
import { ArrowLeft, Download, FileText, Grid3x3, Moon, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTheme } from './ThemeProvider'
import { Menu } from './ui/Menu'
import type { FileType } from '../types/file'
import { formatRelativeTime } from '../utils/date'

interface WorkspaceHeaderProps {
  title: string
  onTitleChange: (title: string) => void
  fileType: FileType
  /** 'saving' mientras el autoguardado está en vuelo, 'saved' cuando ha terminado. */
  saveState: 'saving' | 'saved'
  lastSavedAt?: number
  /** Contenido del menú Exportar (suministrado por cada módulo). */
  exportActions: (close: () => void) => ReactNode
}

/** Cabecera compartida de los módulos: volver, título editable y acciones. */
export function WorkspaceHeader({
  title,
  onTitleChange,
  fileType,
  saveState,
  lastSavedAt,
  exportActions,
}: WorkspaceHeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const isDocument = fileType === 'document'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/90 px-2 backdrop-blur sm:px-3 dark:border-slate-800 dark:bg-slate-900/90">
      <Link
        to="/"
        aria-label="Volver al inicio"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${
          isDocument
            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300'
            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
        }`}
      >
        {isDocument ? <FileText className="h-3.5 w-3.5" /> : <Grid3x3 className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{isDocument ? 'Documento' : 'Hoja de cálculo'}</span>
      </div>

      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        aria-label="Nombre del archivo"
        placeholder="Sin título"
        className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm font-medium text-slate-800 outline-none transition-colors focus:bg-slate-100 dark:text-slate-100 dark:focus:bg-slate-800"
        style={{ maxWidth: 360 }}
      />

      <span
        className={`hidden items-center gap-1 whitespace-nowrap text-xs text-slate-400 md:flex dark:text-slate-500 ${
          saveState === 'saving' ? 'animate-pulse text-amber-500' : ''
        }`}
      >
        {saveState === 'saving' ? 'Guardando…' : lastSavedAt ? `Guardado ${formatRelativeTime(lastSavedAt)}` : 'Guardado'}
      </span>

      <Menu
        label="Exportar"
        align="right"
        trigger={
          <>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </>
        }
      >
        {(close) => exportActions(close)}
      </Menu>

      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        aria-label="Cambiar tema"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </header>
  )
}