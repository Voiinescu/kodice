import type { CellBorders, CellValue, SpreadsheetCell, SpreadsheetFile } from '../../types/file'
import { applyRecalc } from './engines/calc'
import { literalValue } from './engines/cell'

export const DEFAULT_ROWS = 50
export const DEFAULT_COLS = 20
export const DEFAULT_COL_WIDTH = 104
export const DEFAULT_ROW_HEIGHT = 28

export interface SheetConfig {
  rows?: number
  cols?: number
  cells?: Record<string, SpreadsheetCell>
}

export function createEmptySpreadsheet(config: SheetConfig = {}): Omit<SpreadsheetFile, 'id' | 'createdAt' | 'updatedAt' | 'name' | 'type'> {
  return {
    rows: config.rows ?? DEFAULT_ROWS,
    cols: config.cols ?? DEFAULT_COLS,
    colWidths: {},
    cells: config.cells ?? {},
  }
}

/** Hoja de ejemplo con fórmulas y formato para explorar el módulo. */
export function createSampleSpreadsheet(): Omit<SpreadsheetFile, 'id' | 'createdAt' | 'updatedAt' | 'name' | 'type'> {
  const cells: Record<string, SpreadsheetCell> = {}
  const set = (ref: string, raw: string, format?: SpreadsheetCell['format']) => {
    const value: CellValue = literalValue(raw)
    cells[ref] = { raw, value, format }
  }

  set('A1', 'Producto', { bold: true, backColor: '#eef2ff', borders: allBorders() })
  set('B1', 'Cantidad', { bold: true, backColor: '#eef2ff', borders: allBorders(), align: 'center' })
  set('C1', 'Precio', { bold: true, backColor: '#eef2ff', borders: allBorders(), align: 'center' })
  set('D1', 'Total', { bold: true, backColor: '#eef2ff', borders: allBorders(), align: 'right' })

  const rows: [string, number, number][] = [
    ['Notebook', 3, 899],
    ['Monitor 27"', 5, 329],
    ['Teclado mecánico', 8, 129],
    ['Ratón inalámbrico', 12, 49],
    ['Soporte ergonómico', 6, 79],
  ]
  rows.forEach(([name, qty, price], i) => {
    const r = i + 2
    set(`A${r}`, name, { borders: allBorders() })
    set(`B${r}`, String(qty), { borders: allBorders(), align: 'center' })
    set(`C${r}`, String(price), { borders: allBorders(), align: 'right', numFmt: 'currency' })
    set(`D${r}`, `=B${r}*C${r}`, { borders: allBorders(), align: 'right', numFmt: 'currency' })
  })

  set('A8', 'Resumen', { bold: true })
  set('B8', '=SUMA(B2:B6)', { bold: true, align: 'right' })
  set('D8', '=SUMA(D2:D6)', { bold: true, align: 'right', numFmt: 'currency' })

  set('B10', 'Precio medio', { italic: true })
  set('C10', '=PROMEDIO(C2:C6)', { align: 'right', numFmt: 'currency' })
  set('B11', 'Artículo caro', { italic: true })
  set('C11', '=SI(MAX(C2:C6)>500, "Premium", "Estándar")')
  set('B12', 'Descuento 10%', { italic: true })
  set('C12', '=SUMA(D2:D6)*0.1', { align: 'right', numFmt: 'currency' })
  set('E6', '=CONTAR(B2:B6)', { align: 'center' })
  set('F6', '=MIN(C2:C6)', { align: 'right', numFmt: 'currency' })

  return createEmptySpreadsheet({ rows: 30, cols: 12, cells: applyRecalc(cells, 30, 12) })
}

function allBorders(): CellBorders {
  return { top: true, bottom: true, left: true, right: true }
}

export const DEFAULT_SHEET_NAME = 'Hoja de cálculo sin título'