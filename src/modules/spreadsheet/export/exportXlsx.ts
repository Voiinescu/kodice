import * as XLSX from 'xlsx'
import type { SpreadsheetFile } from '../../../types/file'
import { colToLabel } from '../engines/cellRef'
import { rawCellText } from '../engines/formats'

/**
 * Exportador .xlsx basado en SheetJS (xlsx).
 *
 * Genera un libro con una única hoja con los valores calculados (los literales
 * reales si fueran números) y los anchos de columna personalizados. Nota
 * honesta: la versión gratuita de SheetJS no escribe estilos (negrita, color,
 * bordes); por eso aquí se exportan valores y anchos, y el formato visual queda
 * en el formato propio/CSV.
 */

export function exportSpreadsheetXlsx(file: SpreadsheetFile): void {
  const matrix: (string | number | boolean)[][] = []

  for (let r = 0; r < file.rows; r++) {
    const row: (string | number | boolean)[] = []
    for (let c = 0; c < file.cols; c++) {
      const cell = file.cells[`${colToLabel(c)}${r + 1}`]
      if (!cell || !cell.value.ok || cell.value.value === null) {
        row.push('')
        continue
      }
      // Números como número para que Excel los trate aritméticamente; el resto, texto.
      row.push(typeof cell.value.value === 'number' ? cell.value.value : rawCellText(cell.value))
    }
    matrix.push(row)
  }

  const sheet = XLSX.utils.aoa_to_sheet(matrix)
  sheet['!cols'] = Array.from({ length: file.cols }, (_, c) => ({
    wch: Math.max(8, Math.round((file.colWidths[c] ?? 104) / 10)),
  }))

  const workbook = XLSX.utils.book_new()
  const sheetName = (file.name.slice(0, 31) || 'Hoja1').replace(/[\\/:*?[\]]/g, '_')
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName)

  const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${file.name}.xlsx`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}