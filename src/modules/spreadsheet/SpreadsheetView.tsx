import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { SpreadsheetFile } from '../../types/file'
import { getFile, saveFile } from '../../utils/storage'
import { downloadString, sanitizeFileName } from '../../utils/download'
import { WorkspaceHeader } from '../../components/WorkspaceHeader'
import { MenuDivider, MenuItem, MenuLabel } from '../../components/ui/Menu'
import { useToast } from '../../components/feedback/Toasts'
import { useSpreadsheet } from './useSpreadsheet'
import { FormulaBar } from './FormulaBar'
import { SpreadsheetToolbar } from './SpreadsheetToolbar'
import { SheetGrid } from './SheetGrid'
import { exportSpreadsheetXlsx } from './export/exportXlsx'
import { toCsv } from './export/exportCsv'
import { coordsToRef } from './engines/cellRef'

function loadSheet(id: string): SpreadsheetFile | null {
  const record = getFile(id)
  return record && record.type === 'spreadsheet' ? record : null
}

/** Vista del módulo Hoja de cálculo (capa de datos + cabecera + grid). */
export default function SpreadsheetView() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { pushToast } = useToast()

  const [file] = useState<SpreadsheetFile | null>(() => loadSheet(id))
  const [saveState, setSaveState] = useState<'saving' | 'saved'>('saved')
  const [lastSavedAt, setLastSavedAt] = useState<number>(() => file?.updatedAt ?? Date.now())
  const latestFile = useRef<SpreadsheetFile | null>(file)
  latestFile.current = file

  useEffect(() => {
    if (!file) {
      pushToast('La hoja de cálculo no existe o fue eliminada.', 'error')
      navigate('/', { replace: true })
    }
  }, [file, navigate, pushToast])

  // El hook recrearía estado si `file` cambiara de objeto; solo se monta una vez
  // y la persistencia usa una ref, evitando bucles.
  const controller = useSpreadsheet(
    useMemo(() => file ?? (loadSheet(id) as SpreadsheetFile), [id]),
  )

  const persist = useMemo(() => {
    return () => {
      const f = latestFile.current
      if (!f) return
      const next: SpreadsheetFile = { ...controller.state.file, updatedAt: Date.now() }
      saveFile(next)
      setLastSavedAt(next.updatedAt)
      setSaveState('saved')
    }
  }, [controller.state.file])

  useEffect(() => {
    if (!file) return
    setSaveState('saving')
    const timeout = setTimeout(persist, 400)
    const flush = () => persist()
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', flush)
    return () => {
      clearTimeout(timeout)
      flush()
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', flush)
    }
  }, [controller.state.file, persist])

  const rename = (name: string) => {
    if (!file) return
    controller.rename(name.trim() || 'Sin título')
    setSaveState('saving')
  }

  const exportCsv = () => {
    downloadString(toCsv(controller.state.file), `${sanitizeFileName(controller.state.file.name)}.csv`, 'text/csv')
    pushToast('CSV exportado.')
  }

  const exportJson = () => {
    downloadString(
      JSON.stringify(controller.state.file, null, 2),
      `${sanitizeFileName(controller.state.file.name)}.json`,
      'application/json',
    )
    pushToast('Json exportado.')
  }

  if (!file) return null

  const activeCellRef = controller.collapsed
    ? coordsToRef(controller.toOriginal(controller.selection.row), controller.selection.col)
    : ''

  const exportActions = (close: () => void) => (
    <>
      <MenuLabel>Formato</MenuLabel>
      <MenuItem
        onClick={() => {
          close()
          try {
            exportSpreadsheetXlsx(controller.state.file)
            pushToast('Exportado como .xlsx.')
          } catch {
            pushToast('No se pudo exportar el .xlsx.', 'error')
          }
        }}
      >
        Libro Excel (.xlsx)
      </MenuItem>
      <MenuItem
        onClick={() => {
          close()
          exportCsv()
        }}
      >
        Datos CSV (.csv)
      </MenuItem>
      <MenuItem onClick={exportJson}>Hoja Folio (.json)</MenuItem>
      <MenuDivider />
      <MenuLabel>Dimensión</MenuLabel>
      <MenuItem onClick={() => { controller.addRows(); close() }}>Añadir 10 filas</MenuItem>
      <MenuItem onClick={() => { controller.addCols(); close() }}>Añadir 5 columnas</MenuItem>
    </>
  )

  return (
    <div className="flex h-full flex-col">
      <WorkspaceHeader
        title={controller.state.file.name}
        onTitleChange={rename}
        fileType="spreadsheet"
        saveState={saveState}
        lastSavedAt={lastSavedAt}
        exportActions={exportActions}
      />
      <SpreadsheetToolbar ctrl={controller} />
      <FormulaBar ctrl={controller} />
      <div className="min-h-0 flex-1">
        <SheetGrid ctrl={controller} />
      </div>
      <footer className="flex items-center gap-4 border-t border-slate-200 bg-white/90 px-4 py-1.5 text-xs text-slate-400 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <span>
          {controller.state.file.rows} filas · {controller.state.file.cols} columnas
        </span>
        {activeCellRef && <span className="font-mono">{activeCellRef}</span>}
        <span className="hidden sm:inline">Doble clic para editar · Ctrl+C/V copiar/pegar · arrastra la esquina para rellenar</span>
      </footer>
    </div>
  )
}