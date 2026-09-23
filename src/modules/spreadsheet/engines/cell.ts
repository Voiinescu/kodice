import type { CellValue } from '../../../types/file'

/**
 * Interpretación de un literal: una celda cuyo texto NO empieza por '='.
 * Devuelve la representación tipada (número, booleano o cadena).
 */

const NUMBER_PATTERN = /^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/

export function literalValue(raw: string): CellValue {
  const trimmed = raw.trim()
  if (trimmed === '') return { ok: true, value: null }
  if (NUMBER_PATTERN.test(trimmed)) {
    const n = Number(trimmed)
    return { ok: true, value: Number.isFinite(n) ? n : null }
  }
  const upper = trimmed.toUpperCase()
  if (upper === 'TRUE' || upper === 'VERDADERO') return { ok: true, value: true }
  if (upper === 'FALSE' || upper === 'FALSO') return { ok: true, value: false }
  return { ok: true, value: trimmed }
}

export function formulaFromRaw(raw: string): string | null {
  return raw.startsWith('=') ? raw.slice(1) : null
}

/** Convierte un valor en booleano con las reglas de Excel (0 = falso, resto = verdadero). */
export function toBoolean(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  return null
}

/** Intenta interpretar un valor como número (para operaciones aritméticas). */
export function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'))
    return Number.isNaN(n) ? null : n
  }
  if (typeof v === 'boolean') return v ? 1 : 0
  return null
}

export const ERRORS = {
  DIV: '#DIV/0!',
  VALUE: '#VALOR!',
  REF: '#REF!',
  NAME: '#NOMBRE?',
  CIRC: '#CIRC!',
  ERROR: '#ERROR!',
} as const