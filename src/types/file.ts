export type FileType = 'document' | 'spreadsheet'

/** Metadato ligero usado por el launcher para listar archivos recientes. */
export interface FileMeta {
  id: string
  type: FileType
  name: string
  createdAt: number
  updatedAt: number
}

/** Unión de los dos tipos de archivo persistidos en localStorage. */
export type FileRecord = DocumentFile | SpreadsheetFile

export interface DocumentFile {
  id: string
  type: 'document'
  name: string
  createdAt: number
  updatedAt: number
  /** HTML serializado del editor (formato propio). */
  html: string
}

export interface SpreadsheetFile {
  id: string
  type: 'spreadsheet'
  name: string
  createdAt: number
  updatedAt: number
  rows: number
  cols: number
  colWidths: Record<number, number>
  cells: Record<string, SpreadsheetCell>
}

export interface SpreadsheetCell {
  /** Texto bruto: '' (vacío), literal o fórmula que empieza por '='. */
  raw: string
  value: CellValue
  format?: CellFormat
}

export type ScalarValue = string | number | boolean

/** Valor resultante de una celda o fórmula con manejo explícito de errores. */
export type CellValue = { ok: true; value: ScalarValue | null } | { ok: false; error: string }

export type NumFmt = 'general' | 'number' | 'currency' | 'percent'
export type CellAlign = 'left' | 'center' | 'right'

export interface CellBorders {
  top: boolean
  bottom: boolean
  left: boolean
  right: boolean
}

export interface CellFormat {
  bold?: boolean
  italic?: boolean
  color?: string
  backColor?: string
  align?: CellAlign
  numFmt?: NumFmt
  borders?: CellBorders
}

export interface CellCoords {
  row: number
  col: number
}