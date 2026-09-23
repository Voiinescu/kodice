/**
 * Geometría del grid: convierte coordenadas de columna/fila en posiciones
 * de píxel usando las anchuras acumuladas de las columnas. Se utilizan
 * sumas acumulativas para resolver "qué columnas están visibles" en O(log n).
 */

export const ROW_HEADER_WIDTH = 48
export const COL_HEADER_HEIGHT = 28
export const DEFAULT_ROW_HEIGHT = 28
export const MIN_COL_WIDTH = 48

export interface GridMetrics {
  rowHeaderWidth: number
  colHeaderHeight: number
  rowHeight: number
  colWidths: number[]
  /** offsetX de cada columna (x de comienzo, ya incluye la cabecera de filas). */
  colOffsets: number[]
  totalWidth: number
  totalHeight: number
}

export function buildMetrics(colWidths: number[], rows: number, rowHeight = DEFAULT_ROW_HEIGHT): GridMetrics {
  const offsets: number[] = []
  let acc = ROW_HEADER_WIDTH
  for (const w of colWidths) {
    offsets.push(acc)
    acc += w
  }
  return {
    rowHeaderWidth: ROW_HEADER_WIDTH,
    colHeaderHeight: COL_HEADER_HEIGHT,
    rowHeight,
    colWidths,
    colOffsets: offsets,
    totalWidth: acc,
    totalHeight: COL_HEADER_HEIGHT + rows * rowHeight,
  }
}

export interface VisibleRange {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

/** Índices de fila visibles según el scroll vertical. */
export function visibleRows(scrollTop: number, viewportHeight: number, rows: number, rowHeight: number): [number, number] {
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 2)
  const end = Math.min(rows - 1, start + Math.ceil(viewportHeight / rowHeight) + 4)
  return [start, end]
}

/** Índices de columna visibles usando búsqueda binaria sobre offsets acumulados. */
export function visibleColumns(scrollLeft: number, viewportWidth: number, metrics: GridMetrics): [number, number] {
  const { colOffsets, colWidths } = metrics
  const colCount = colWidths.length
  const viewportEnd = scrollLeft + viewportWidth

  // Primera columna cuyo offset >= scrollLeft
  let lo = 0
  let hi = colCount - 1
  let first = colCount - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (colOffsets[mid] + colWidths[mid] >= scrollLeft) {
      first = mid
      hi = mid - 1
    } else {
      lo = mid + 1
    }
  }

  let last = first
  while (last + 1 < colCount && colOffsets[last + 1] < viewportEnd) last++

  return [Math.max(0, first - 1), Math.min(colCount - 1, last + 1)]
}

/** X (píxel) de una columna; Y (píxel) de una fila. */
export function colX(metrics: GridMetrics, col: number): number {
  return metrics.colOffsets[col] ?? metrics.totalWidth
}
export function rowY(colHeaderHeight: number, row: number, rowHeight: number): number {
  return colHeaderHeight + row * rowHeight
}

/** Píxel X en el que acaba una columna. */
export function colEndX(metrics: GridMetrics, col: number): number {
  return colX(metrics, col) + (metrics.colWidths[col] ?? 0)
}