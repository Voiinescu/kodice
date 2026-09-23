/**
 * Hook principal de la hoja de cálculo: une el reducer, la persistencia con
 * autoguardado y el estado de interacción (selección y edición).
 */

import { useCallback, useMemo, useReducer, useState } from 'react'
import type { CellCoords, SpreadsheetFile } from '../../types/file'
import { getFile } from '../../utils/storage'
import { sheetReducer, type SheetState } from './state/reducer'
import type { CellWrite } from './engines/cellTransform'
import type { CellFormat } from '../../types/file'
import { coordsToRef } from './engines/cellRef'

export interface EditableCell {
  row: number
  /** fila ORIGINAL (coordenada de datos), ya mapeada desde pantalla. */
  col: number
  text: string
}

export interface SelectionBox extends CellCoords {
  row2: number
  col2: number
}

function stateFromPersisted(file: SpreadsheetFile): SheetState {
  return { file, rowOrder: null, filter: null }
}

export function loadSpreadsheet(id: string): SpreadsheetFile | null {
  const record = getFile(id)
  return record && record.type === 'spreadsheet' ? record : null
}

export function useSpreadsheet(file: SpreadsheetFile) {
  const [state, dispatch] = useReducer(sheetReducer, undefined, () => stateFromPersisted(file))
  const [anchor, setAnchor] = useState<CellCoords>({ row: 0, col: 0 })
  const [focus, setFocus] = useState<CellCoords>({ row: 0, col: 0 })
  const [editing, setEditing] = useState<EditableCell | null>(null)

  const rowOrder = state.rowOrder
  const displayRows = rowOrder ? rowOrder.length : state.file.rows

  /** Fila original de una fila en pantalla. */
  const toOriginal = useCallback(
    (displayRow: number) => (rowOrder ? rowOrder[displayRow] : displayRow),
    [rowOrder],
  )
  /** Fila en pantalla de una fila original. */
  const toDisplay = useCallback(
    (origRow: number) => (rowOrder ? rowOrder.indexOf(origRow) : origRow),
    [rowOrder],
  )

  const selection: SelectionBox = useMemo(
    () => ({
      row: Math.min(anchor.row, focus.row),
      col: Math.min(anchor.col, focus.col),
      row2: Math.max(anchor.row, focus.row),
      col2: Math.max(anchor.col, focus.col),
    }),
    [anchor, focus],
  )

  const selectionCells = useMemo(() => {
    const cells: CellCoords[] = []
    for (let r = selection.row; r <= selection.row2; r++)
      for (let c = selection.col; c <= selection.col2; c++) cells.push({ row: r, col: c })
    return cells
  }, [selection])

  const hasSelection = selection.row2 - selection.row > 0 || selection.col2 - selection.col > 0

  const setSelection = useCallback(
    (a: CellCoords, f: CellCoords) => {
      setEditing(null)
      setAnchor({ row: Math.max(0, a.row), col: Math.max(0, a.col) })
      setFocus({ row: Math.max(0, f.row), col: Math.max(0, f.col) })
    },
    [],
  )

  const collapsed = !hasSelection

  const startEdit = useCallback(
    (row: number, col: number, text: string) => {
      const orig = toOriginal(row)
      const cellText = state.file.cells[coordsToRef(orig, col).toUpperCase()]?.raw ?? ''
      setEditing({ row: orig, col, text: text ?? cellText })
    },
    [state.file.cells, toOriginal],
  )

  const commitEdit = useCallback(() => {
    if (!editing) return
    const { row, col, text } = editing
    setEditing(null)
    dispatch({ type: 'setCell', row, col, raw: text })
    // al confirmar, volvemos la selección a la celda editada
    const disp = toDisplay(row)
    setAnchor({ row: disp, col })
    setFocus({ row: disp, col })
  }, [editing, toDisplay])

  const cancelEdit = useCallback(() => setEditing(null), [])

  const editAt = useCallback(
    (row: number, col: number, text: string) => {
      const disp = toDisplay(row)
      setAnchor({ row: disp, col })
      setFocus({ row: disp, col })
      startEdit(disp, col, text)
    },
    [startEdit, toDisplay],
  )

  const writeCells = useCallback(
    (writes: CellWrite[], start?: CellCoords) => {
      dispatch({ type: 'writeCells', writes })
      if (start) {
        setAnchor({ row: start.row, col: start.col })
        setFocus({ row: start.row, col: start.col })
      }
    },
    [],
  )

  const setFormat = useCallback(
    (patch: Partial<CellFormat>, coords?: CellCoords[]) => {
      dispatch({ type: 'setFormat', patch, coords: coords ?? selectionCells })
    },
    [selectionCells],
  )

  const clearSelection = useCallback(() => dispatch({ type: 'clearRange', coords: selectionCells }), [selectionCells])

  const setColWidth = useCallback((col: number, width: number) => dispatch({ type: 'setColWidth', col, width }), [])

  const addRows = useCallback(() => dispatch({ type: 'addRows', count: 10 }), [])
  const addCols = useCallback(() => dispatch({ type: 'addCols', count: 5 }), [])

  const sortColumn = useCallback(
    (col: number, dir: 'asc' | 'desc') => dispatch({ type: 'sortCol', col, dir }),
    [],
  )

  const setFilter = useCallback(
    (col: number, visible: string[]) => dispatch({ type: 'setFilter', col, visible }),
    [],
  )
  const clearFilter = useCallback(() => dispatch({ type: 'clearFilter' }), [])

  const rename = useCallback((name: string) => dispatch({ type: 'rename', name }), [])

  return {
    state,
    dispatch,
    editing,
    setEditing,
    startEdit,
    commitEdit,
    cancelEdit,
    editAt,
    selection,
    selectionCells,
    hasSelection,
    collapsed,
    setSelection,
    anchor,
    focus,
    setAnchor,
    setFocus,
    toOriginal,
    toDisplay,
    displayRows,
    writeCells,
    setFormat,
    clearSelection,
    setColWidth,
    addRows,
    addCols,
    sortColumn,
    setFilter,
    clearFilter,
    rename,
  }
}

export type SpreadsheetController = ReturnType<typeof useSpreadsheet>