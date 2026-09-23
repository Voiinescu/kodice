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

const emptyCell = (): SpreadsheetCell => ({ raw: '', value: { ok: true, value: null } })

const identity = (size: number): number[] => Array.from({ length: size }, (_, i) => i)

const keyOf = (row: number, col: number) => coordsToRef(row, col).toUpperCase()

function recalcFile(file: SpreadsheetFile): SpreadsheetFile {
  return { ...file, cells: applyRecalc(file.cells, file.rows, file.cols) }
}

function applyWrites(state: SheetState, writes: CellWrite[]): SheetState {
  if (writes.length === 0) return state
  const cells: Record<string, SpreadsheetCell> = { ...state.file.cells }
  for (const w of writes) {
    const key = keyOf(w.row, w.col)
    const previous = cells[key]
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
  return { ...state, file: recalcFile({ ...state.file, cells }) }
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
      for (const c of coords) {
        cells[keyOf(c.row, c.col)] = emptyCell()
      }
      return { ...state, file: recalcFile({ ...state.file, cells }) }
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