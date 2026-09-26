import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CellCoords, CellFormat, SpreadsheetCell } from '../../types/file'
import { DEFAULT_COL_WIDTH } from './defaults'
import {
  buildMetrics,
  colEndX,
  colX,
  rowY,
  visibleColumns,
  visibleRows,
  MIN_COL_WIDTH,
  ROW_HEADER_WIDTH,
  COL_HEADER_HEIGHT,
} from './gridGeometry'
import type { GridMetrics } from './gridGeometry'
import { colToLabel, coordsToRef } from './engines/cellRef'
import { formatCellValue } from './engines/formats'
import { buildFillCells, buildPasteCells } from './engines/cellTransform'
import { fromTsv, toTsv } from '../../utils/tsv'
import type { SpreadsheetController } from './useSpreadsheet'
import { useToast } from '../../components/feedback/Toasts'

/** Grid completo: cabeceras, celdas virtualizadas, selección y fill handle. */
export function SheetGrid({ ctrl }: { ctrl: SpreadsheetController }) {
  const { state, selection, editing } = ctrl
  const { pushToast } = useToast()

  const scrollRef = useRef<HTMLDivElement>(null)
  const [scroll, setScroll] = useState({ left: 0, top: 0 })
  const [viewport, setViewport] = useState({ width: 800, height: 500 })

  const metrics: GridMetrics = useMemo(() => {
    const widths = Array.from({ length: state.file.cols }, (_, c) => state.file.colWidths[c] ?? DEFAULT_COL_WIDTH)
    return buildMetrics(widths, state.file.rows)
  }, [state.file.cols, state.file.colWidths, state.file.rows])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      setScroll({ left: el.scrollLeft, top: el.scrollTop })
    }
    const ro = new ResizeObserver(() => {
      setViewport({ width: el.clientWidth, height: el.clientHeight })
      onScroll()
    })
    ro.observe(el)
    el.addEventListener('scroll', onScroll)
    onScroll()
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [])

  const [rowStart, rowEnd] = visibleRows(scroll.top, viewport.height, state.file.rows, metrics.rowHeight)
  const [colStart, colEnd] = visibleColumns(scroll.left, viewport.width, metrics)

  const hiddenRows = useMemo(() => {
    if (!state.filter) return null
    const { col, visible } = state.filter
    const hidden = new Set<number>()
    for (let drow = 0; drow < ctrl.displayRows; drow++) {
      const orig = ctrl.toOriginal(drow)
      const cell = state.file.cells[coordsToRef(orig, col).toUpperCase()]
      const text = cell ? formatCellValue(cell.value, cell.format) : ''
      if (!visible.includes(text)) hidden.add(drow)
    }
    return hidden
  }, [state.file, state.filter, ctrl])

  const isRowHidden = hiddenRows?.has.bind(hiddenRows) ?? (() => false)

  const cellAtPointInContent = useCallback(
    (x: number, y: number) => {
      const col = metrics.colWidths.reduce((best, w, i) => (colX(metrics, i) + w >= x ? best : i), 0)
      const c = Math.max(0, Math.min(state.file.cols - 1, col))
      const r = Math.max(0, Math.min(state.file.rows - 1, Math.floor((y - metrics.colHeaderHeight) / metrics.rowHeight)))
      return { row: r, col: c }
    },
    [metrics, state.file.cols, state.file.rows],
  )

  const cellFromEvent = (clientX: number, clientY: number) => {
    const el = scrollRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left + el.scrollLeft
    const y = clientY - rect.top + el.scrollTop
    return cellAtPointInContent(x, y)
  }

  // ---- Selección por arrastre ----
  const dragRef = useRef<CellCoords | null>(null)
  const onCellMouseDown = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault()
    scrollRef.current?.focus()
    const target = { row, col }
    dragRef.current = target
    const anchor = e.shiftKey ? { row: ctrl.anchor.row, col: ctrl.anchor.col } : target
    ctrl.setSelection(anchor, target)
    const move = (ev: MouseEvent) => {
      const cell = cellFromEvent(ev.clientX, ev.clientY)
      if (cell && (cell.row !== dragRef.current?.row || cell.col !== dragRef.current?.col)) {
        dragRef.current = cell
        ctrl.setSelection(anchor, cell)
      }
    }
    const up = (ev: MouseEvent) => {
      const cell = cellFromEvent(ev.clientX, ev.clientY)
      if (cell) ctrl.setSelection(anchor, cell)
      dragRef.current = null
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  // ---- Fill handle ----
  const [fillRect, setFillRect] = useState<{ top: number; left: number; right: number; bottom: number } | null>(null)
  const fillRef = useRef<{ anchor: CellCoords; current: CellCoords } | null>(null)
  const onFillPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const anchor = { row: ctrl.selection.row, col: ctrl.selection.col }
    fillRef.current = { anchor, current: anchor }
    const move = (ev: PointerEvent) => {
      const cell = cellFromEvent(ev.clientX, ev.clientY)
      if (!cell) return
      fillRef.current = { anchor, current: cell }
      const r0 = Math.min(anchor.row, cell.row)
      const c0 = Math.min(anchor.col, cell.col)
      const r1 = Math.max(anchor.row, cell.row)
      const c1 = Math.max(anchor.col, cell.col)
      setFillRect({
        top: rowY(COL_HEADER_HEIGHT, r0, metrics.rowHeight),
        left: colX(metrics, c0),
        right: colEndX(metrics, c1),
        bottom: rowY(COL_HEADER_HEIGHT, r1, metrics.rowHeight) + metrics.rowHeight,
      })
    }
    const up = () => {
      if (fillRef.current) {
        const { anchor, current } = fillRef.current
        applyFill(anchor, current)
      }
      fillRef.current = null
      setFillRect(null)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const applyFill = (anchor: CellCoords, current: CellCoords) => {
    const aOrig = ctrl.toOriginal(anchor.row)
    const cOrig = ctrl.toOriginal(current.row)
    const a = { row: aOrig, col: anchor.col }
    const b = { row: cOrig, col: current.col }
    const src = { row: a.row, col: a.col, row2: a.row, col2: a.col }
    const dst = {
      row: Math.min(a.row, b.row),
      col: Math.min(a.col, b.col),
      row2: Math.max(a.row, b.row),
      col2: Math.max(a.col, b.col),
    }
    if (dst.row2 - dst.row === 0 && dst.col2 - dst.col === 0) return
    const writes = buildFillCells(state.file.cells, src, dst)
    ctrl.writeCells(writes)
  }

  // ---- Ancho de columna ----
  const resizeRef = useRef<{ col: number; startX: number; startWidth: number } | null>(null)
  const onColResizePointerDown = (e: React.PointerEvent, col: number) => {
    e.preventDefault()
    e.stopPropagation()
    resizeRef.current = { col, startX: e.clientX, startWidth: state.file.colWidths[col] ?? DEFAULT_COL_WIDTH }
    const move = (ev: PointerEvent) => {
      const r = resizeRef.current
      if (!r) return
      const width = Math.max(MIN_COL_WIDTH, r.startWidth + (ev.clientX - r.startX))
      ctrl.setColWidth(r.col, Math.round(width))
    }
    const up = () => {
      resizeRef.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // ---- Portapapeles ----
  const internalClip = useRef<{
    src: { row: number; col: number; row2: number; col2: number }
    cells: Record<string, SpreadsheetCell>
    tsv: string
  } | null>(null)

  const copySelection = (cut: boolean) => {
    if (selection.row < 0) return
    const srcOrig = {
      row: ctrl.toOriginal(selection.row),
      col: selection.col,
      row2: ctrl.toOriginal(selection.row2),
      col2: selection.col2,
    }
    const rows: string[][] = []
    for (let dr = selection.row; dr <= selection.row2; dr++) {
      const rowArr: string[] = []
      for (let dc = selection.col; dc <= selection.col2; dc++) {
        const orig = ctrl.toOriginal(dr)
        const cell = state.file.cells[coordsToRef(orig, dc).toUpperCase()]
        rowArr.push(cell ? formatCellValue(cell.value, cell.format) : '')
      }
      rows.push(rowArr)
    }
    const tsv = toTsv(rows)
    internalClip.current = { src: srcOrig, cells: state.file.cells, tsv }
    navigator.clipboard?.writeText(tsv).catch(() => undefined)
    if (cut) ctrl.clearSelection()
  }

  const pasteClipboard = async () => {
    if (selection.row < 0) return
    const anchorOrig = ctrl.toOriginal(selection.row)
    let writes
    if (internalClip.current) {
      writes = buildPasteCells(internalClip.current.cells, internalClip.current.src, { row: anchorOrig, col: selection.col })
    } else {
      let text = ''
      try {
        text = (await navigator.clipboard.readText()) ?? ''
      } catch {
        pushToast('No se pudo leer el portapapeles.', 'error')
        return
      }
      const grid = fromTsv(text)
      writes = grid.flatMap((rowArr, dr) =>
        rowArr.slice(0, state.file.cols - selection.col).map((raw, dc) => ({ row: anchorOrig + dr, col: selection.col + dc, raw })),
      )
    }
    ctrl.writeCells(writes, { row: selection.row, col: selection.col })
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey
    if (editing) return
    const r = selection.row
    const c = selection.col

    const moveFocus = (dr: number, dc: number, extend: boolean) => {
      e.preventDefault()
      const nextR = Math.max(0, Math.min(ctrl.displayRows - 1, r + dr))
      const nextC = Math.max(0, Math.min(state.file.cols - 1, c + dc))
      const anchor = extend ? ctrl.anchor : { row: nextR, col: nextC }
      ctrl.setSelection(anchor, { row: nextR, col: nextC })
    }

    if (e.key === 'ArrowDown') return moveFocus(1, 0, e.shiftKey)
    if (e.key === 'ArrowUp') return moveFocus(-1, 0, e.shiftKey)
    if (e.key === 'ArrowRight') return moveFocus(0, 1, e.shiftKey)
    if (e.key === 'ArrowLeft') return moveFocus(0, -1, e.shiftKey)
    if (e.key === 'Enter') return moveFocus(1, 0, false)
    if (e.key === 'Tab') return moveFocus(0, 1, false)
    if (mod && (e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y')) {
      e.preventDefault()
      if (e.shiftKey || e.key === 'y' || e.key === 'Y') ctrl.redo()
      else ctrl.undo()
      return
    }
    if (mod && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault()
      copySelection(false)
      return
    }
    if (mod && (e.key === 'x' || e.key === 'X')) {
      e.preventDefault()
      copySelection(true)
      return
    }
    if (mod && (e.key === 'v' || e.key === 'V')) {
      e.preventDefault()
      pasteClipboard()
      return
    }
    if (mod && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault()
      ctrl.setSelection({ row: 0, col: 0 }, { row: ctrl.displayRows - 1, col: state.file.cols - 1 })
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      ctrl.clearSelection()
      return
    }
    if (e.key === 'F2') {
      e.preventDefault()
      const orig = ctrl.toOriginal(r)
      const key = coordsToRef(orig, c).toUpperCase()
      const raw = state.file.cells[key]?.raw ?? ''
      ctrl.setEditing({ row: orig, col: c, text: raw })
      return
    }
    if (!mod && !e.altKey && e.key.length === 1) {
      e.preventDefault()
      const orig = ctrl.toOriginal(r)
      ctrl.setEditing({ row: orig, col: c, text: e.key })
    }
  }

  // ---- Render ----
  const cells = []
  for (let drow = rowStart; drow <= rowEnd; drow++) {
    if (isRowHidden(drow)) continue
    const orig = ctrl.toOriginal(drow)
    for (let c = colStart; c <= colEnd; c++) {
      const key = coordsToRef(orig, c).toUpperCase()
      const cell = state.file.cells[key]
      cells.push(
        <CellView
          key={key}
          rowDisplay={drow}
          col={c}
          x={colX(metrics, c)}
          y={rowY(metrics.colHeaderHeight, drow, metrics.rowHeight)}
          width={metrics.colWidths[c]}
          height={metrics.rowHeight}
          text={cell ? formatCellValue(cell.value, cell.format) : ''}
          format={cell?.format}
          selected={drow >= selection.row && drow <= selection.row2 && c >= selection.col && c <= selection.col2}
          isEditing={editing?.row === orig && editing?.col === c}
          onMouseDown={(e) => onCellMouseDown(e, drow, c)}
          onDoubleClick={() => ctrl.startEdit(drow, c, cell?.raw ?? '')}
        />,
      )
    }
  }

  const selPos = selection.row >= 0
    ? {
        top: rowY(metrics.colHeaderHeight, selection.row, metrics.rowHeight),
        left: colX(metrics, selection.col),
        right: colEndX(metrics, selection.col2),
        bottom: rowY(metrics.colHeaderHeight, selection.row2, metrics.rowHeight) + metrics.rowHeight,
      }
    : null

  const editingCell = editing
    ? {
        top: rowY(metrics.colHeaderHeight, ctrl.toDisplay(editing.row), metrics.rowHeight),
        left: colX(metrics, editing.col),
        width: metrics.colWidths[editing.col],
      }
    : null

  const rowHeaderCells = []
  for (let r = rowStart; r <= rowEnd; r++) {
    if (isRowHidden(r)) continue
    const orig = ctrl.toOriginal(r)
    rowHeaderCells.push(
      <button
        key={`r${r}`}
        className="row-header"
        style={{ top: rowY(metrics.colHeaderHeight, r, metrics.rowHeight), height: metrics.rowHeight }}
        onClick={() => ctrl.setSelection({ row: r, col: selection.col }, { row: r, col: selection.col2 })}
      >
        {orig + 1}
      </button>,
    )
  }

  const colHeaderCells = []
  for (let c = 0; c < state.file.cols; c++) {
    colHeaderCells.push(
      <div key={`c${c}`} className="col-header" style={{ width: metrics.colWidths[c] }}>
        <span className="col-header-label">{colToLabel(c)}</span>
        {state.filter?.col === c && <FilterDot />}
        <div
          className="col-resizer"
          onPointerDown={(e) => onColResizePointerDown(e, c)}
          title="Ajustar ancho de columna"
        />
      </div>,
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {/* Cabecera de columnas */}
      <div className="flex shrink-0 border-b border-slate-200 dark:border-slate-700">
        <div className="corner-header" style={{ width: ROW_HEADER_WIDTH, height: COL_HEADER_HEIGHT }} />
        <div className="overflow-hidden" style={{ flex: 1 }}>
          <div
            className="flex"
            style={{ width: metrics.totalWidth, transform: `translateX(-${scroll.left}px)`, willChange: 'transform' }}
          >
            {colHeaderCells}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Cabecera de filas */}
        <div className="overflow-hidden" style={{ width: ROW_HEADER_WIDTH }}>
          <div className="relative" style={{ width: ROW_HEADER_WIDTH, height: metrics.totalHeight, transform: `translateY(-${scroll.top}px)` }}>
            {rowHeaderCells}
          </div>
        </div>

        {/* Región de celdas */}
        <div
          ref={scrollRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="relative min-w-0 flex-1 overflow-auto outline-none"
          data-testid="sheet-grid"
        >
          <div className="relative" style={{ width: metrics.totalWidth, height: metrics.totalHeight }}>
            {cells}
            {selPos && !editing && (
              <div
                className={`pointer-events-none absolute z-10 ${
                  ctrl.collapsed ? 'border-[1.5px] border-accent-600 dark:border-accent-400' : 'border border-accent-500 bg-accent-100/20 dark:border-accent-400/70 dark:bg-accent-500/10'
                }`}
                style={{
                  top: selPos.top,
                  left: selPos.left,
                  width: selPos.right - selPos.left,
                  height: selPos.bottom - selPos.top,
                }}
              />
            )}
            {selPos && ctrl.collapsed && !editing && (
              <button
                className="fill-handle"
                style={{
                  left: selPos.right - 4,
                  top: selPos.bottom - 4,
                }}
                onPointerDown={onFillPointerDown}
                aria-label="Arrastrar para rellenar celdas"
              />
            )}
            {fillRect && (
              <div
                className="pointer-events-none absolute z-10 border-2 border-dashed border-accent-600"
                style={{ top: fillRect.top, left: fillRect.left, width: fillRect.right - fillRect.left, height: fillRect.bottom - fillRect.top }}
              />
            )}
            {editingCell && editing && (
              <input
                autoFocus
                value={editing.text}
                onChange={(e) => ctrl.setEditing({ ...editing, text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation()
                    ctrl.commitEdit()
                  } else if (e.key === 'Escape') {
                    e.stopPropagation()
                    ctrl.cancelEdit()
                  } else if (e.key === 'Tab') {
                    e.preventDefault()
                    e.stopPropagation()
                    ctrl.commitEdit()
                    ctrl.setSelection(
                      { row: Math.min(editing.row, ctrl.displayRows - 1), col: Math.min(editing.col + 1, state.file.cols - 1) },
                      { row: Math.min(editing.row, ctrl.displayRows - 1), col: Math.min(editing.col + 1, state.file.cols - 1) },
                    )
                  }
                }}
                onBlur={() => ctrl.commitEdit()}
                className="absolute z-20 rounded-none border-[1.5px] border-accent-600 bg-white px-1.5 font-sans text-sm text-slate-800 outline-none dark:bg-slate-900 dark:text-slate-100"
                style={{
                  top: editingCell.top,
                  left: editingCell.left,
                  width: Math.max(editingCell.width, 160),
                  height: metrics.rowHeight,
                }}
                spellCheck={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterDot() {
  return (
    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-indigo-600 dark:text-indigo-400">
      ▼
    </span>
  )
}

const borderSide = (v?: boolean) => (v ? '1.5px solid #94a3b8' : 'none')

const CellView = function CellView({
  rowDisplay,
  col,
  x,
  y,
  width,
  height,
  text,
  format,
  selected,
  isEditing,
  onMouseDown,
  onDoubleClick,
}: {
  rowDisplay: number
  col: number
  x: number
  y: number
  width: number
  height: number
  text: string
  format?: CellFormat
  selected: boolean
  isEditing: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onDoubleClick: () => void
}) {
  return (
    <div
      className="sheet-cell"
      style={{
        left: x,
        top: y,
        width,
        height,
        fontWeight: format?.bold ? 700 : 400,
        fontStyle: format?.italic ? 'italic' : undefined,
        color: format?.color,
        backgroundColor: format?.backColor,
        textAlign: format?.align ?? 'left',
        borderTop: borderSide(format?.borders?.top),
        borderBottom: selected ? borderSide(format?.borders?.bottom ?? false) || undefined : borderSide(format?.borders?.bottom),
        borderLeft: borderSide(format?.borders?.left),
        borderRight: borderSide(format?.borders?.right),
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      title={text}
      aria-label={`Celda ${rowDisplay + 1}-${colToLabel(col)}: ${text}`}
    >
      {isEditing ? '' : text}
    </div>
  )
}