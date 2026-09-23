import type { KeyboardEvent } from 'react'
import { Sigma } from 'lucide-react'
import { coordsToRef } from './engines/cellRef'
import type { SpreadsheetController } from './useSpreadsheet'

/** Barra de fórmulas: muestra la celda activa y permite editar su contenido. */
export function FormulaBar({ ctrl }: { ctrl: SpreadsheetController }) {
  const { selection, editing, state, toOriginal, collapsed } = ctrl

  const activeOriginRow = collapsed ? toOriginal(selection.row) : -1
  const activeRef =
    activeOriginRow >= 0
      ? coordsToRef(activeOriginRow, selection.col)
      : collapsed
        ? ''
        : `${coordsToRef(toOriginal(selection.row), selection.col)}:${coordsToRef(
            toOriginal(selection.row2),
            selection.col2,
          )}`
  const activeCellKey = activeOriginRow >= 0 ? coordsToRef(activeOriginRow, selection.col).toUpperCase() : ''
  const raw = activeCellKey ? state.file.cells[activeCellKey]?.raw ?? '' : ''

  const isEditing = editing !== null
  const showValue = isEditing ? editing.text : raw

  const handleFocus = () => {
    if (!isEditing && activeOriginRow >= 0) {
      ctrl.setEditing({ row: activeOriginRow, col: selection.col, text: raw })
    }
  }

  const handleChange = (text: string) => {
    if (editing) ctrl.setEditing({ ...editing, text })
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      ctrl.commitEdit()
      ctrl.setFocus((f) => ({ ...f, row: Math.min(f.row + 1, ctrl.displayRows - 1) }))
    } else if (e.key === 'Escape') {
      ctrl.cancelEdit()
    }
  }

  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-900">
      <Sigma aria-hidden className="h-4 w-4 text-slate-400" />
      <span className="w-16 shrink-0 rounded-md bg-slate-100 px-2 py-1 text-center font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {activeRef || '—'}
      </span>
      <input
        value={showValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        aria-label="Contenido de la celda activa"
        placeholder="Escribe un valor o fórmula (=SUM(A1:A5))"
        className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-sm text-slate-800 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
    </div>
  )
}