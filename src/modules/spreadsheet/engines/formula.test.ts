/**
 * Tests del motor de fórmulas y utilidades de la hoja de cálculo.
 * Se ejecutan en Node (vitest environment 'node'), sin DOM.
 */

import { describe, expect, it } from 'vitest'
import type { CellValue, SpreadsheetCell } from '../../../types/file'
import { literalValue, toBoolean, toNumber } from './cell'
import {
  applyRecalc,
  recalculate,
} from './calc'
import {
  buildFillCells,
  buildPasteCells,
  shiftFormulaText,
  shiftReference,
} from './cellTransform'
import {
  colToLabel,
  coordsToRef,
  labelToCol,
  parseRange,
  refToCoords,
} from './cellRef'
import { evaluate } from './formula/evaluator'
import { parseFormula } from './formula/parser'
import type { EvalContext } from './formula/evaluator'
import { buildMetrics, colX, visibleColumns } from '../gridGeometry'
import { fromTsv, toTsv } from '../../../utils/tsv'

type Scalar = null | number | string | boolean

const ok = (value: Scalar): CellValue => ({ ok: true, value })

function evalText(src: string, cells: Record<string, CellValue> = {}, rows = 100, cols = 26): CellValue {
  const ctx: EvalContext = {
    getCellValue: (ref) => cells[ref.toUpperCase()] ?? ok(null),
    rows,
    cols,
  }
  return evaluate(parseFormula(src), ctx)
}

function cell(raw: string): SpreadsheetCell {
  return { raw, value: literalValue(raw) }
}

/** Extrae el valor de una CellValue (solo para aserciones de valor). */
function unwrap(cv: CellValue): unknown {
  return cv.ok ? cv.value : cv.error
}

describe('literalValue', () => {
  it('tipifica números, booleanos, texto y vacío', () => {
    expect(literalValue('42')).toEqual(ok(42))
    expect(literalValue('  -3.5 ')).toEqual(ok(-3.5))
    expect(literalValue('1e3')).toEqual(ok(1000))
    expect(literalValue('VERDADERO')).toEqual(ok(true))
    expect(literalValue('FALSO')).toEqual(ok(false))
    expect(unwrap(literalValue(''))).toBeNull()
    expect(unwrap(literalValue('hola'))).toBe('hola')
  })

  it('toNumber y toBoolean siguen reglas tipo Excel', () => {
    expect(toNumber('3,14')).toBe(3.14)
    expect(toNumber('abc')).toBeNull()
    expect(toBoolean(true)).toBe(true)
    expect(toBoolean(0)).toBe(false)
    expect(toBoolean(2)).toBe(true)
    expect(toBoolean('x')).toBeNull()
  })
})

describe('referencias de celda', () => {
  it('convierte entre A1 y coordenadas', () => {
    expect(coordsToRef(0, 0)).toBe('A1')
    expect(coordsToRef(4, 2)).toBe('C5')
    expect(colToLabel(0)).toBe('A')
    expect(colToLabel(25)).toBe('Z')
    expect(colToLabel(26)).toBe('AA')
    expect(labelToCol('C')).toBe(2)
    expect(refToCoords('C5')).toEqual({ row: 4, col: 2 })
    expect(parseRange('B2', 'D5')).toEqual({ row: 1, col: 1, row2: 4, col2: 3 })
  })
})

describe('evaluación de expresiones', () => {
  it('aritmética y precedencia', () => {
    expect(evalText('2+3*4')).toEqual(ok(14))
    expect(evalText('(2+3)*4')).toEqual(ok(20))
    expect(evalText('10/4')).toEqual(ok(2.5))
    expect(evalText('2^3')).toEqual(ok(8))
    expect(evalText('-5')).toEqual(ok(-5))
    expect(evalText('50%')).toEqual(ok(0.5))
    expect(evalText('1/0').ok).toBe(false)
  })

  it('funciones en inglés y español', () => {
    const cells = {
      A1: ok(2),
      A2: ok(3),
      A3: ok(5),
      A4: ok('texto'),
    }
    expect(evalText('SUM(A1:A3)', cells)).toEqual(ok(10))
    expect(evalText('SUMA(A1:A3)', cells)).toEqual(ok(10))
    expect(evalText('PROMEDIO(A1:A3)', cells)).toEqual(ok(10 / 3))
    expect(evalText('MEDIA(A1:A3)', cells)).toEqual({ ok: false, error: '#NOMBRE?' })
    expect(evalText('MIN(A1:A4)', cells)).toEqual(ok(2))
    expect(evalText('MAX(A1:A3)', cells)).toEqual(ok(5))
    expect(evalText('COUNT(A1:A4)', cells)).toEqual(ok(3))
    expect(evalText('CONTAR(A1:A4)', cells)).toEqual(ok(3))
    expect(evalText('ABS(-7)', cells)).toEqual(ok(7))
    expect(evalText('ROUND(2.5678, 2)', cells)).toEqual(ok(2.57))
  })

  it('SI evalúa solo la rama elegida', () => {
    const cells = { A1: ok(5) }
    expect(evalText('IF(A1>10, "si", "no")', cells)).toEqual(ok('no'))
    expect(evalText('IF(A1>10, 1/0, 99)', cells)).toEqual(ok(99))
    expect(evalText('IF(A1>3, 42, 99)', cells)).toEqual(ok(42))
    expect(evalText('SI(A1>3, 1, 2)', cells)).toEqual(ok(1))
  })

  it('texto, booleanos y comparaciones', () => {
    expect(evalText('"Hola "&"mundo"')).toEqual(ok('Hola mundo'))
    expect(evalText('TRUE')).toEqual(ok(true))
    expect(evalText('VERDADERO')).toEqual(ok(true))
    expect(evalText('2<3')).toEqual(ok(true))
    expect(evalText('"a"<>"b"')).toEqual(ok(true))
  })

  it('referencias fuera de rango devuelven #REF!', () => {
    expect(evalText('X99', {}, 5, 5).ok).toBe(false)
  })
})

describe('recálculo', () => {
  it('resuelve dependencias y valores de fórmulas', () => {
    const cells: Record<string, SpreadsheetCell> = {
      A1: cell('2'),
      A2: cell('3'),
      B1: cell('=SUMA(A1:A2)'),
      B2: cell('=B1*2'),
      C1: { raw: '=PROMEDIO(A1:A2)', value: { ok: false, error: '#ERROR!' } },
    }
    const out = applyRecalc(cells, 100, 26)
    expect(out.B1.value).toEqual(ok(5))
    expect(out.B2.value).toEqual(ok(10))
    expect(out.C1.value).toEqual(ok(2.5))
  })

  it('detecta referencias circulares', () => {
    const cells: Record<string, SpreadsheetCell> = {
      A1: cell('=B1'),
      B1: cell('=A1'),
    }
    const out = applyRecalc(cells, 100, 26)
    expect(out.A1.value).toEqual({ ok: false, error: '#CIRC!' })
    expect(out.B1.value).toEqual({ ok: false, error: '#CIRC!' })
  })

  it('recalculate memoiza y devuelve el mapa de valores', () => {
    const cells: Record<string, SpreadsheetCell> = { A1: cell('=2+2') }
    const memo = recalculate(cells, 100, 26)
    expect(Array.from(memo.entries())).toEqual([['A1', ok(4)]])
  })
})

describe('transformaciones copiar/rellenar', () => {
  it('desplaza referencias relativas y respeta las absolutas', () => {
    expect(shiftReference('B3', 1, 2)).toBe('D4')
    expect(shiftReference('$B$3', 1, 2)).toBe('$B$3')
    expect(shiftReference('B$3', 1, 2)).toBe('D$3')
    expect(shiftReference('$B3', 1, 2)).toBe('$B4')
    expect(shiftFormulaText('=B3*$C$2+A1', 1, 1)).toBe('=C4*$C$2+B2')
  })

  it('rellena el patrón en baldosas (tiling)', () => {
    const cells: Record<string, SpreadsheetCell> = {
      A1: cell('1'),
      B1: cell('=A1+10'),
    }
    const writes = buildFillCells(cells, { row: 0, col: 0, row2: 0, col2: 1 }, { row: 1, col: 0, row2: 2, col2: 1 })
    expect(writes).toHaveLength(4)
    const byRef = Object.fromEntries(writes.map((w) => [coordsToRef(w.row, w.col), w.raw]))
    expect(byRef.A2).toBe('1')
    expect(byRef.B2).toBe('=A2+10')
    expect(byRef.A3).toBe('1')
    expect(byRef.B3).toBe('=A3+10')
  })

  it('copia rectángulos con desplazamiento constante', () => {
    const cells: Record<string, SpreadsheetCell> = { A1: cell('=B1'), B1: cell('7') }
    const writes = buildPasteCells(cells, { row: 0, col: 0, row2: 0, col2: 1 }, { row: 2, col: 0 })
    const byRef = Object.fromEntries(writes.map((w) => [coordsToRef(w.row, w.col), w.raw]))
    expect(byRef.A3).toBe('=B3')
    expect(byRef.B3).toBe('7')
  })
})

describe('geometría del grid', () => {
  it('calcula posiciones y columnas visibles', () => {
    const metrics = buildMetrics([100, 100, 100], 10)
    expect(colX(metrics, 0)).toBe(48)
    expect(colX(metrics, 1)).toBe(148)
    expect(visibleColumns(0, 300, metrics)).toEqual([0, 2])
    expect(visibleColumns(200, 300, metrics)).toEqual([0, 2])
  })
})

describe('TSV (portapapeles)', () => {
  it('redondea ida y vuelta manteniendo comillas y tabuladores', () => {
    const grid = [
      ['a', 'b c'],
      ['"d"', 'e\tf'],
    ]
    const text = toTsv(grid)
    expect(fromTsv(text)).toEqual(grid)
    expect(toTsv([['x', 'y']])).toBe('x\ty')
  })
})