/**
 * Transformaciones de copia/relleno.
 *
 * Al copiar o arrastrar una selección, las referencias RELATIVAS (A1) de las
 * fórmulas deben desplazarse en la misma cantidad que se mueva la celda; las
 * ABSOLUTAS ($A$1) deben quedar fijas. Esto se implementa re-tokenizando la
 * fórmula y reescribiendo cada token de referencia con el desplazamiento.
 *
 * buildFillCells replica el patrón de la selección origen "en baldosas" (tiling),
 * como hace Excel: al arrastrar 2 celdas 5 filas hacia abajo, el patrón se repite.
 */

import type { CellFormat, SpreadsheetCell } from '../../../types/file'
import { coordsToRef, floorDiv, labelToCol, colToLabel, parseRange, positiveMod, type NormalizedRange } from './cellRef'
import { tokenize } from './formula/tokenizer'

export interface CellWrite {
  row: number
  col: number
  raw: string
  format?: CellFormat
}

/** Desplaza UNA referencia ("B3", "$B3", "B$3", "$B$3"). */
export function shiftReference(rawRef: string, dRow: number, dCol: number): string {
  const m = /^(\$?)([A-Za-z]+)(\$?)([0-9]+)$/.exec(rawRef)
  if (!m) return rawRef
  const isAbsCol = m[1] === '$'
  const letters = m[2]
  const isAbsRow = m[3] === '$'
  const digits = m[4]

  let colLetters = letters
  let rowDigits = digits
  if (!isAbsCol) {
    const c = labelToCol(letters) + dCol
    if (c < 0) return rawRef // fuera de rango: dejar la referencia intacta
    colLetters = colToLabel(c)
  }
  if (!isAbsRow) {
    const r = parseInt(digits, 10)
    if (r + dRow < 1) return rawRef
    rowDigits = String(r + dRow)
  }
  return `${isAbsCol ? '$' : ''}${colLetters}${isAbsRow ? '$' : ''}${rowDigits}`
}

/** Reescritura completa de una fórmula al desplazarla (mantiene espacios entre tokens). */
export function shiftFormulaText(formulaText: string, dRow: number, dCol: number): string {
  let tokens
  try {
    tokens = tokenize(formulaText)
  } catch {
    return formulaText
  }
  return tokens
    .map((tok) => (tok.type === 'ref' ? shiftReference(tok.raw, dRow, dCol) : tok.raw))
    .join('')
}

/**
 * Genera las celdas a escribir al arrastrar (fill handle) desde la selección
 * origen hasta el rectángulo destino. El destino puede extenderse en filas,
 * columnas o ambas; el patrón se repite mediante "tiling".
 */
export function buildFillCells(
  cells: Record<string, SpreadsheetCell>,
  src: NormalizedRange,
  dst: NormalizedRange,
): CellWrite[] {
  const h = src.row2 - src.row + 1
  const w = src.col2 - src.col + 1
  const writes: CellWrite[] = []

  for (let r = dst.row; r <= dst.row2; r++) {
    for (let c = dst.col; c <= dst.col2; c++) {
      const insideSource = r >= src.row && r <= src.row2 && c >= src.col && c <= src.col2
      if (insideSource) continue

      // Celda del patrón que se replica y cuántos "bloques" nos separa de ella.
      const patternRow = src.row + positiveMod(r - src.row, h)
      const patternCol = src.col + positiveMod(c - src.col, w)
      const blockRows = floorDiv(r - src.row, h)
      const blockCols = floorDiv(c - src.col, w)

      const key = coordsToRef(patternRow, patternCol).toUpperCase()
      const cell = cells[key]
      if (!cell || cell.raw === '') {
        writes.push({ row: r, col: c, raw: '', format: undefined })
        continue
      }
      const rawShifted = cell.raw.startsWith('=')
        ? shiftFormulaText(cell.raw, blockRows * h, blockCols * w)
        : cell.raw
      writes.push({ row: r, col: c, raw: rawShifted, format: cell.format })
    }
  }
  return writes
}

/**
 * Celdas a escribir al pegar: copia lineal del rectángulo origen anclada en la
 * esquina superior izquierda del destino. El desplazamiento es constante para
 * toda la copia (igual que en Excel).
 */
export function buildPasteCells(
  cells: Record<string, SpreadsheetCell>,
  src: NormalizedRange,
  dstAnchor: { row: number; col: number },
): CellWrite[] {
  const writes: CellWrite[] = []
  const dRow = dstAnchor.row - src.row
  const dCol = dstAnchor.col - src.col
  for (let r = src.row; r <= src.row2; r++) {
    for (let c = src.col; c <= src.col2; c++) {
      const key = coordsToRef(r, c).toUpperCase()
      const cell = cells[key]
      if (!cell || cell.raw === '') {
        writes.push({ row: r + dRow, col: c + dCol, raw: '', format: undefined })
        continue
      }
      const rawShifted = cell.raw.startsWith('=') ? shiftFormulaText(cell.raw, dRow, dCol) : cell.raw
      writes.push({ row: r + dRow, col: c + dCol, raw: rawShifted, format: cell.format })
    }
  }
  return writes
}

export function parseRangeText(from: string, to: string): NormalizedRange {
  return parseRange(from, to)
}