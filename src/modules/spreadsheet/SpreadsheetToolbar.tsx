import { useMemo, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownAZ,
  ArrowUpAZ,
  Bold,
  Italic,
  Filter as FilterIcon,
  ScanText,
  Square,
  Table,
  TableProperties,
} from 'lucide-react'
import { ToolbarButton, ToolbarDivider, ToolbarGroupLabel } from '../../components/ui/ToolbarButton'
import { Menu, MenuDivider, MenuItem, MenuLabel } from '../../components/ui/Menu'
import { ColorField } from '../../components/ui/ColorField'
import type { SpreadsheetController } from './useSpreadsheet'
import { formatCellValue } from './engines/formats'
import { coordsToRef } from './engines/cellRef'

/** Barra de herramientas de formato de celdas, orden y filtros. */
export function SpreadsheetToolbar({ ctrl }: { ctrl: SpreadsheetController }) {
  const { state, selection } = ctrl
  const filter = state.filter
  const activeCol = ctrl.collapsed ? selection.col : -1
  const hasTarget = ctrl.collapsed || selection.row2 - selection.row > 0 || selection.col2 - selection.col > 0

  const distinctValues = useMemo(() => {
    if (activeCol < 0) return []
    const seen = new Set<string>()
    for (let r = 0; r < state.file.rows; r++) {
      const cell = state.file.cells[coordsToRef(r, activeCol).toUpperCase()]
      const text = cell ? formatCellValue(cell.value, cell.format) : ''
      if (!seen.has(text)) seen.add(text)
    }
    return Array.from(seen).slice(0, 200)
  }, [state.file, activeCol])

  const apply = (patch: Parameters<SpreadsheetController['setFormat']>[0]) => ctrl.setFormat(patch)

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur sm:px-3 dark:border-slate-800 dark:bg-slate-900/95">
      <ToolbarGroupLabel>Fuente</ToolbarGroupLabel>
      <ToolbarButton icon={<Bold className="h-4 w-4" />} label="Negrita" active={false} disabled={!hasTarget} onClick={() => apply({ bold: true })} />
      <ToolbarButton icon={<Italic className="h-4 w-4" />} label="Cursiva" disabled={!hasTarget} onClick={() => apply({ italic: true })} />
      <ColorField label="Color de texto" value={undefined} onChange={(c) => apply({ color: c })} />
      <ColorField label="Color de relleno" twoTone value={undefined} onChange={(c) => apply({ backColor: c })} />
      <ToolbarDivider />

      <ToolbarGroupLabel>Alinear</ToolbarGroupLabel>
      <ToolbarButton icon={<AlignLeft className="h-4 w-4" />} label="Izquierda" disabled={!hasTarget} onClick={() => apply({ align: 'left' })} />
      <ToolbarButton icon={<AlignCenter className="h-4 w-4" />} label="Centro" disabled={!hasTarget} onClick={() => apply({ align: 'center' })} />
      <ToolbarButton icon={<AlignRight className="h-4 w-4" />} label="Derecha" disabled={!hasTarget} onClick={() => apply({ align: 'right' })} />
      <ToolbarDivider />

      <ToolbarGroupLabel>Datos</ToolbarGroupLabel>
      <Menu
        label="Formato de número"
        trigger={<ScanText className="h-4 w-4" />}
      >
        {(close) => (
          <>
            <MenuLabel>Formato de número</MenuLabel>
            <MenuItem
              active={(selectionCellsFmt(ctrl) ?? 'general') === 'general'}
              onClick={() => { apply({ numFmt: 'general' }); close() }}
            >
              General
            </MenuItem>
            <MenuItem
              active={(selectionCellsFmt(ctrl) ?? 'general') === 'number'}
              onClick={() => { apply({ numFmt: 'number' }); close() }}
            >
              123 · Número
            </MenuItem>
            <MenuItem
              active={(selectionCellsFmt(ctrl) ?? 'general') === 'currency'}
              onClick={() => { apply({ numFmt: 'currency' }); close() }}
            >
              € · Moneda (EUR)
            </MenuItem>
            <MenuItem
              active={(selectionCellsFmt(ctrl) ?? 'general') === 'percent'}
              onClick={() => { apply({ numFmt: 'percent' }); close() }}
            >
              % · Porcentaje
            </MenuItem>
          </>
        )}
      </Menu>

      <Menu label="Bordes" trigger={<TableProperties className="h-4 w-4" />}>
        {(close) => (
          <>
            <MenuLabel>Bordes de celda</MenuLabel>
            <MenuItem icon={<Table className="h-4 w-4" />} onClick={() => { apply({ borders: { top: true, bottom: true, left: true, right: true } }); close() }}>
              Todas las líneas
            </MenuItem>
            <MenuItem icon={<Square className="h-4 w-4" />} onClick={() => { apply({ borders: { top: false, bottom: false, left: false, right: false } }); close() }}>
              Sin bordes
            </MenuItem>
          </>
        )}
      </Menu>

      <Menu label="Ordenar / Filtrar" trigger={<FilterIcon className="h-4 w-4" />}>
        {(close) => {
          const canSort = activeCol >= 0
          const sortAsc = () => { ctrl.sortColumn(activeCol, 'asc'); close() }
          const sortDesc = () => { ctrl.sortColumn(activeCol, 'desc'); close() }
          return (
            <>
              <MenuLabel>Ordenar por columna {activeCol >= 0 ? coordsToRef(0, activeCol) : ''}</MenuLabel>
              <MenuItem icon={<ArrowDownAZ className="h-4 w-4" />} disabled={!canSort} onClick={sortAsc}>
                A → Z ascendente
              </MenuItem>
              <MenuItem icon={<ArrowUpAZ className="h-4 w-4" />} disabled={!canSort} onClick={sortDesc}>
                Z → A descendente
              </MenuItem>
              <MenuDivider />
              <FilterPanel ctrl={ctrl} activeCol={activeCol} distinctValues={distinctValues} close={close} />
            </>
          )
        }}
      </Menu>

      {filter && (
        <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
          Filtro columna {coordsToRef(0, filter.col)}
          <button className="underline underline-offset-2" onClick={ctrl.clearFilter}>
            quitar
          </button>
        </span>
      )}
    </div>
  )
}

function FilterPanel({
  ctrl,
  activeCol,
  distinctValues,
  close,
}: {
  ctrl: SpreadsheetController
  activeCol: number
  distinctValues: string[]
  close: () => void
}) {
  const activeFilter = ctrl.state.filter && ctrl.state.filter.col === activeCol ? ctrl.state.filter : null
  const [checked, setChecked] = useState<Set<string> | null>(
    activeFilter ? new Set(activeFilter.visible) : new Set(distinctValues),
  )

  const effectiveCheckbox = checked ?? new Set(distinctValues)
  const allChecked = distinctValues.length > 0 && distinctValues.every((v) => effectiveCheckbox.has(v))

  return (
    <>
      <MenuLabel>Filtrar columna {activeCol >= 0 ? coordsToRef(0, activeCol) : ''}</MenuLabel>
      <MenuItem
        onClick={() => {
          const next = new Set<string>()
          if (!allChecked) distinctValues.forEach((v) => next.add(v))
          setChecked(next)
        }}
      >
        {allChecked ? 'Quitar todos' : 'Marcar todos'}
      </MenuItem>
      <div className="max-h-52 overflow-y-auto px-1 py-1">
        {distinctValues.length === 0 && (
          <p className="px-2.5 py-1 text-xs text-slate-400">Sin valores en esta columna</p>
        )}
        {distinctValues.map((v) => (
          <label
            key={v}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <input
              type="checkbox"
              checked={effectiveCheckbox.has(v)}
              onChange={() => {
                const next = new Set(effectiveCheckbox)
                if (next.has(v)) next.delete(v)
                else next.add(v)
                setChecked(next)
              }}
              className="accent-accent-600"
            />
            <span className="truncate">{v === '' ? '(vacío)' : v}</span>
          </label>
        ))}
      </div>
      <MenuDivider />
      <div className="flex justify-end gap-2 px-2 pb-1">
        <button
          className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          onClick={() => {
            ctrl.clearFilter()
            close()
          }}
        >
          Limpiar
        </button>
        <button
          className="rounded-md bg-accent-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-700"
          onClick={() => {
            if (activeCol < 0) return
            ctrl.setFilter(activeCol, Array.from(effectiveCheckbox))
            close()
          }}
        >
          Aplicar
        </button>
      </div>
    </>
  )
}

function selectionCellsFmt(ctrl: SpreadsheetController): 'general' | 'number' | 'currency' | 'percent' | null {
  const first = ctrl.selectionCells[0]
  if (!first) return null
  const cell = ctrl.state.file.cells[coordsToRef(ctrl.toOriginal(first.row), first.col).toUpperCase()]
  return cell?.format?.numFmt ?? null
}