/**
 * Recálculo de la hoja.
 *
 * Tantos los lit... dados un mapa de celdas, se recalcula EL VALOR de todas las
 * fórmulas. Para resolver dependencias se evalúa de forma perezosa y recursiva
 * con memoización: `resolve` guarda en un Map los resultados ya calculados y usa
 * un conjunto `visiting` para detectar referencias circulares (A1 -> A1).
 *
 * El tamaño típico de la hoja (miles de celdas, pocas fórmulas) hace que
 * recalcularlo todo tras cada edición sea instantáneo y, sobre todo, a prueba
 * de errores de dependencias desactualizadas.
 */

import type { CellValue, SpreadsheetCell } from '../../../types/file'
import { literalValue } from './cell'
import { evaluate, type EvalContext } from './formula/evaluator'
import { parseFormula } from './formula/parser'

export const CIRCULAR_REF_ERROR = '#CIRC!'

export function recalculate(
  cells: Record<string, SpreadsheetCell>,
  rows: number,
  cols: number,
): Map<string, CellValue> {
  const memo = new Map<string, CellValue>()
  const visiting = new Set<string>()

  const resolve: EvalContext['getCellValue'] = (ref: string) => {
    const key = ref.toUpperCase()
    if (memo.has(key)) return memo.get(key) as CellValue
    if (visiting.has(key)) return { ok: false, error: CIRCULAR_REF_ERROR }

    const cell = cells[key]
    if (!cell) return { ok: true, value: null }

    visiting.add(key)
    let value: CellValue
    if (cell.raw.startsWith('=')) {
      try {
        const ast = parseFormula(cell.raw.slice(1))
        value = evaluate(ast, { getCellValue: resolve, rows, cols })
      } catch {
        value = { ok: false, error: '#ERROR!' }
      }
    } else {
      value = literalValue(cell.raw)
    }
    visiting.delete(key)
    memo.set(key, value)
    return value
  }

  for (const key of Object.keys(cells)) {
    if (cells[key].raw.startsWith('=')) resolve(key)
  }
  return memo
}

/** Aplica el recálculo sobre el mapa de celdas, devolviendo un mapa nuevo. */
export function applyRecalc(
  cells: Record<string, SpreadsheetCell>,
  rows: number,
  cols: number,
): Record<string, SpreadsheetCell> {
  const values = recalculate(cells, rows, cols)
  const next: Record<string, SpreadsheetCell> = { ...cells }
  for (const key of values.keys()) {
    const cell = next[key]
    if (cell) next[key] = { ...cell, value: values.get(key) as CellValue }
  }
  return next
}