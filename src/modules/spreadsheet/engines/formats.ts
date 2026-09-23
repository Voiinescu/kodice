/**
 * Formato de visualización de valores según el formato numérico de la celda.
 * Se usa Intl.NumberFormat con la locale 'es' (así 1234.5 se ve "1.234,5").
 */

import type { CellFormat, CellValue } from '../../../types/file'

const numberFmt = new Intl.NumberFormat('es', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const currencyFmt = new Intl.NumberFormat('es', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
})
const percentFmt = new Intl.NumberFormat('es', { style: 'percent', maximumFractionDigits: 2 })

/** Valor general sin ruido de coma flotante (0.30000000000004 -> 0.3). */
function generalNumber(n: number): string {
  const trimmed = Number(n.toFixed(10))
  return Number.isInteger(trimmed) ? String(trimmed) : String(trimmed)
}

export function formatCellValue(value: CellValue, format?: CellFormat): string {
  if (!value.ok) return value.error
  if (value.value === null) return ''
  const v = value.value

  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v !== 'number') return String(v)

  switch (format?.numFmt ?? 'general') {
    case 'number':
      return numberFmt.format(v)
    case 'currency':
      return currencyFmt.format(v)
    case 'percent':
      return percentFmt.format(v)
    default:
      return generalNumber(v)
  }
}

/** Valor sin formato (para copiar a portapapeles y exportar CSV/XLSX). */
export function rawCellText(value: CellValue): string {
  if (!value.ok) return value.error
  if (value.value === null) return ''
  if (typeof value.value === 'boolean') return value.value ? 'TRUE' : 'FALSE'
  return String(value.value)
}

/** Clave para ordenar/filtrar: números primero, luego texto (reglas tipo Excel). */
export function sortKeyOf(value: CellValue): { n: number | null; s: string } {
  if (!value.ok) return { n: null, s: '' }
  if (typeof value.value === 'number') return { n: value.value, s: '' }
  if (value.value === null) return { n: null, s: '' }
  return { n: null, s: String(value.value) }
}

export function compareValues(a: CellValue, b: CellValue): number {
  const ka = sortKeyOf(a)
  const kb = sortKeyOf(b)
  if (ka.n !== null && kb.n !== null) return ka.n - kb.n
  if (ka.s !== '' && kb.s !== '') return ka.s.localeCompare(kb.s, 'es', { numeric: true, sensitivity: 'base' })
  // números después de texto (convención de Excel: el texto va antes)
  const hasA = ka.n !== null || ka.s !== ''
  const hasB = kb.n !== null || kb.s !== ''
  if (hasA !== hasB) return hasA && !hasB ? -1 : 1
  return 0
}