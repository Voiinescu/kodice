/**
 * Reducer puro del estado de la hoja de cálculo.
 *
 * Mantiene la vista ordenada (`rowOrder`) y el filtro aplicado (`filter`) como
 * capas separadas de los datos; las celdas SIEMPRE viven en coordenadas
 * originales. Cada mutación de datos pasa por `applyRecalc` para mantener
 * coherentes los valores computados de las fórmulas.
 */

import type { CellFormat, CellCoords, SpreadsheetCell, SpreadsheetFile } from '../../../types/file'
import { literalValue } from '../engines/cell'
import { applyRecalc } from '../engines/calc'
import { coordsToRef } from '../engines/cellRef'
import { compareValues } from '../engines/formats'
import type { CellWrite } from '../engines/cellTransform'

export type Direction = 'asc' | 'desc'

export interface SheetFilter {
  col: number
  visible: string[]
}

export interface SheetState {
  file: SpreadsheetFile
  /** Orden de presentación: posición de pantalla i -> fila original. null = orden natural. */
  rowOrder: number[] | null
  filter: SheetFilter | null
}

export type SheetAction =
  | { type: 'setCell'; row: number; col: number; raw: string }
  | { type: 'writeCells'; writes: CellWrite[] }
  | { type: 'setFormat'; patch: Partial<CellFormat>; coords: CellCoords[] }
  | { type: 'clearRange'; coords: CellCoords[] }
  | { type: 'setColWidth'; col: number; width: number }
  | { type: 'addRows'; count: number }
  | { type: 'addCols'; count: number }
  | { type: 'sortCol'; col: number; dir: Direction }
  | { type: 'setFilter'; col: number; visible: string[] }
  | { type: 'clearFilter' }
  | { type: 'rename'; name: string }

export type HistoryAction = { type: 'undo' } | { type: 'redo' }

const emptyCell = (): SpreadsheetCell => ({ raw: '', value: { ok: true, value: null } })

const identity = (size: number): number[] => Array.from({ length: size }, (_, i) => i)

const keyOf = (row: number, col: number) => coordsToRef(row, col).toUpperCase()

function recalcFile(file: SpreadsheetFile): SpreadsheetFile {
  return { ...file, cells: applyRecalc(file.cells, file.rows, file.cols) }
}

function applyWrites(state: SheetState, writes: CellWrite[]): SheetState {
  if (writes.length === 0) return state
  const cells: Record<string, SpreadsheetCell> = { ...state.file.cells }
  let changed = false
  for (const w of writes) {
    const key = keyOf(w.row, w.col)
    const previous = cells[key]
    // Escritura sin impacto (mismo raw): se omite para no manchar el historial
    // ni provocar nuevos objetos. Un cambio de formato se dispara con 'setFormat'.
    if (previous && previous.raw === w.raw) continue
    changed = true
    if (w.raw === '' && !w.format) {
      cells[key] = emptyCell()
      continue
    }
    cells[key] = {
      raw: w.raw,
      value: w.raw.startsWith('=') ? { ok: false, error: '#ERROR!' } : literalValue(w.raw),
      format: w.format ?? previous?.format,
    }
  }
  return changed ? { ...state, file: recalcFile({ ...state.file, cells }) } : state
}

function applyFormat(state: SheetState, patch: Partial<CellFormat>, coords: CellCoords[]): SheetState {
  if (coords.length === 0) return state
  const cells: Record<string, SpreadsheetCell> = { ...state.file.cells }
  for (const c of coords) {
    const key = keyOf(c.row, c.col)
    const prev = cells[key]
    cells[key] = prev
      ? { ...prev, format: { ...(prev.format ?? {}), ...patch } }
      : { ...emptyCell(), format: { ...patch } }
  }
  return { ...state, file: { ...state.file, cells } }
}

export function sheetReducer(state: SheetState, action: SheetAction): SheetState {
  switch (action.type) {
    case 'setCell':
      return applyWrites(state, [{ row: action.row, col: action.col, raw: action.raw }])

    case 'writeCells':
      return applyWrites(state, action.writes)

    case 'setFormat':
      return applyFormat(state, action.patch, action.coords)

    case 'clearRange': {
      const coords = action.coords
      if (coords.length === 0) return state
      const cells: Record<string, SpreadsheetCell> = { ...state.file.cells }
      let changed = false
      for (const c of coords) {
        const key = keyOf(c.row, c.col)
        if (cells[key]?.raw !== '' || cells[key]?.format) {
          cells[key] = emptyCell()
          changed = true
        }
      }
      return changed ? { ...state, file: recalcFile({ ...state.file, cells }) } : state
    }

    case 'setColWidth': {
      const colWidths = { ...state.file.colWidths, [action.col]: action.width }
      return { ...state, file: { ...state.file, colWidths } }
    }

    case 'addRows': {
      const file = { ...state.file, rows: state.file.rows + action.count }
      const rowOrder = state.rowOrder
        ? [...state.rowOrder, ...identity(action.count).map((r) => r + state.file.rows)]
        : null
      return { ...state, file, rowOrder }
    }

    case 'addCols':
      return { ...state, file: { ...state.file, cols: state.file.cols + action.count } }

    case 'sortCol': {
      const { rows } = state.file
      const base = state.rowOrder ?? identity(rows)
      const valuesAt = (origRow: number) =>
        state.file.cells[keyOf(origRow, action.col)]?.value ?? { ok: true as const, value: null }
      const sorted = identity(base.length).sort((a, b) => {
        const cmp = compareValues(valuesAt(base[a]), valuesAt(base[b]))
        const dirCmp = action.dir === 'asc' ? cmp : -cmp
        return dirCmp !== 0 ? dirCmp : a - b // estable
      })
      const rowOrder = sorted.map((i) => base[i])
      return { ...state, rowOrder }
    }

    case 'setFilter':
      return { ...state, filter: { col: action.col, visible: action.visible } }

    case 'clearFilter':
      return { ...state, filter: null }

    case 'rename':
      return { ...state, file: { ...state.file, name: action.name } }

    default:
      return state
  }
}

export { applyWrites, applyFormat }

// ---------------------------------------------------------------------------
// Historial de deshacer/rehacer.
//
// La vista ordenada (`rowOrder`), el filtro y los datos viven juntos en
// `SheetState`, así que una "foto" (snapshot) por acción captura todo por igual.
// Estrategia:
//  - Cada snapshot guarda el estado ANTERIOR a la acción (pila `past`), como
//    en el editor de texto: deshacer vuelve al último estado registrado.
//  - `future` guarda los estados re-insertados al deshacer, para poder rehacer.
//  - Al aplicar cualquier cambio nuevo (sea o no deshacible) se vacía `future`,
//    porque la rama de acciones previas queda invalidada.
//  - `setColWidth` se lanza repetidamente durante el arrastre del borde, y
//    `rename` toca metadatos del título; ambos se excluyen del historial.
// ---------------------------------------------------------------------------

export const SHEET_HISTORY_LIMIT = 100

export interface SheetHistory {
  past: SheetState[]
  present: SheetState
  future: SheetState[]
}

export function initSheetHistory(state: SheetState): SheetHistory {
  return { past: [], present: state, future: [] }
}

const UNDOABLE_ACTIONS: ReadonlySet<SheetAction['type']> = new Set([
  'setCell',
  'writeCells',
  'setFormat',
  'clearRange',
  'addRows',
  'addCols',
  'sortCol',
  'setFilter',
  'clearFilter',
])

function isUndoable(action: SheetAction): boolean {
  return UNDOABLE_ACTIONS.has(action.type)
}

/** Reducer que envuelve `sheetReducer` añadiendo snapshots para deshacer/rehacer. */
export function sheetHistoryReducer(history: SheetHistory, action: SheetAction | HistoryAction): SheetHistory {
  if (action.type === 'undo') {
    if (history.past.length === 0) return history
    const previous = history.past[history.past.length - 1]
    return {
      past: history.past.slice(0, -1),
      present: previous,
      future: [history.present, ...history.future].slice(0, SHEET_HISTORY_LIMIT),
    }
  }

  if (action.type === 'redo') {
    if (history.future.length === 0) return history
    const next = history.future[0]
    return {
      past: [...history.past, history.present].slice(-SHEET_HISTORY_LIMIT),
      present: next,
      future: history.future.slice(1),
    }
  }

  const present = sheetReducer(history.present, action)
  // Reducer devuelve la misma referencia en acciones sin efecto real (p. ej.
  // escritura vacía); no la registramos en el historial.
  if (present === history.present) return history

  if (!isUndoable(action)) {
    return { past: history.past, present, future: [] }
  }

  const past = [...history.past, history.present]
  if (past.length > SHEET_HISTORY_LIMIT) past.shift()
  return { past, present, future: [] }
}