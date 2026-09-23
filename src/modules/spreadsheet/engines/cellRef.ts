/**
 * Conversión entre coordenadas {fila, columna} y notación A1 ("B3", "$A$1").
 * El '$' marca referencias absolutas y se ignora al resolver la posición.
 */

export interface CellCoordsLike {
  row: number
  col: number
}

/** 0 -> "A", 25 -> "Z", 26 -> "AA" ... (máx. 3 letras, como Excel). */
export function colToLabel(col: number): string {
  let c = col + 1
  let label = ''
  while (c > 0) {
    const rem = (c - 1) % 26
    label = String.fromCharCode(65 + rem) + label
    c = Math.floor((c - 1) / 26)
  }
  return label
}

/** "A" -> 0, "Z" -> 25, "AA" -> 26 ... */
export function labelToCol(label: string): number {
  let col = 0
  for (const ch of label.toUpperCase()) {
    col = col * 26 + (ch.charCodeAt(0) - 64)
  }
  return col - 1
}

const REF_PATTERN = /^\$?([A-Za-z]{1,3})\$?([0-9]+)$/

export function isCellRef(text: string): boolean {
  return REF_PATTERN.test(text.trim())
}

/** "A1" -> {row: 0, col: 0}. Lanza si el formato no es válido. */
export function refToCoords(ref: string): CellCoordsLike {
  const m = REF_PATTERN.exec(ref.trim())
  if (!m) throw new Error(`Referencia de celda inválida: "${ref}"`)
  return { row: parseInt(m[2], 10) - 1, col: labelToCol(m[1]) }
}

/** {row: 0, col: 0} -> "A1". */
export function coordsToRef(row: number, col: number): string {
  if (row < 0 || col < 0) return '#REF!'
  return `${colToLabel(col)}${row + 1}`
}

/** Elimina los marcadores '$' de una referencia para resolverla. */
export function stripAbsolute(ref: string): string {
  return ref.replace(/\$/g, '').toUpperCase()
}

/** Rango normalizado como rectángulo {fila/col inicial y final, inclusivos}. */
export interface NormalizedRange extends CellCoordsLike {
  row2: number
  col2: number
}

/** "B2:D5" -> rectángulo normalizado (min y max de filas/columnas). */
export function parseRange(fromRef: string, toRef: string): NormalizedRange {
  const a = refToCoords(stripAbsolute(fromRef))
  const b = refToCoords(stripAbsolute(toRef))
  return {
    row: Math.min(a.row, b.row),
    col: Math.min(a.col, b.col),
    row2: Math.max(a.row, b.row),
    col2: Math.max(a.col, b.col),
  }
}

/** Devuelve las coordenadas de un rango en orden fila-mayor (de arriba a abajo). */
export function rangeCoords(range: NormalizedRange): CellCoordsLike[] {
  const out: CellCoordsLike[] = []
  for (let r = range.row; r <= range.row2; r++) {
    for (let c = range.col; c <= range.col2; c++) {
      out.push({ row: r, col: c })
    }
  }
  return out
}

/** module positivo (mod para índices, evita negativos de arrastrar hacia arriba). */
export function positiveMod(n: number, m: number): number {
  return ((n % m) + m) % m
}

export function floorDiv(n: number, m: number): number {
  return Math.floor(n / m)
}

export function isOutOfBounds(row: number, col: number, rows: number, cols: number): boolean {
  return row < 0 || col < 0 || row >= rows || col >= cols
}