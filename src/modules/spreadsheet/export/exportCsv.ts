import type { SpreadsheetFile } from '../../../types/file'
import { colToLabel } from '../engines/cellRef'
import { rawCellText } from '../engines/formats'

/**
 * Exportador CSV mínimo y predecible: separador ',', escape por comillas
 * dobles, con la cabecera A... como primera fila. Usa los VALORES calculados
 * (no las fórmulas), igual que exportar "los valores" en Excel.
 */

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function toCsv(file: SpreadsheetFile): string {
  const lines: string[] = []
  const header = Array.from({ length: file.cols }, (_, c) => colToLabel(c))
  lines.push(header.join(','))

  for (let r = 0; r < file.rows; r++) {
    const row: string[] = []
    for (let c = 0; c < file.cols; c++) {
      const cell = file.cells[`${colToLabel(c)}${r + 1}`]
      row.push(csvEscape(cell ? rawCellText(cell.value) : ''))
    }
    lines.push(row.join(','))
  }
  return lines.join('\n')
}