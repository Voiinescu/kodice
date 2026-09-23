/**
 * Evaluador del AST de fórmulas.
 *
 * Recorre el árbol producido por `parseFormula` resolviendo referencias a
 * través de un contexto (`getCellValue`), que es quien controla la memoria
 * caché y la detección de ciclos durante el recálculo (ver calc.ts).
 *
 * Las funciones trabajan sobre una lista plana de valores: cuando un argumento
 * es un rango se expande a sus celdas; cuando es una celda o un literal, se usa
 * el valor único. La única excepción es IF, que evalúa sus ramas de forma
 * diferida (solo la rama elegida) con `evalScalar` para no disparar errores
 * innecesarios en la rama muerta.
 */

import type { CellValue, ScalarValue } from '../../../../types/file'
import { ERRORS, toBoolean, toNumber } from '../cell'
import { coordsToRef, isOutOfBounds, parseRange, rangeCoords, stripAbsolute } from '../cellRef'
import type { Expr, BinaryOp } from './ast'

export interface EvalContext {
  /** Resuelve una referencia (p.ej. "B3") a su valor actual. */
  getCellValue: (ref: string) => CellValue
  rows: number
  cols: number
}

const num = (value: number): CellValue => ({ ok: true, value })
const bool = (value: boolean): CellValue => ({ ok: true, value })
const str = (value: string): CellValue => ({ ok: true, value })
const err = (error: string): CellValue => ({ ok: false, error })

function resolveRef(ref: string, ctx: EvalContext): CellValue {
  const clean = stripAbsolute(ref)
  const r = /^([A-Z]+)([0-9]+)$/.exec(clean)
  if (!r) return err(ERRORS.REF)
  const row = parseInt(r[2], 10) - 1
  const colFromLabel = (label: string): number => {
    let c = 0
    for (const ch of label) c = c * 26 + (ch.charCodeAt(0) - 64)
    return c - 1
  }
  const col = colFromLabel(r[1])
  if (isOutOfBounds(row, col, ctx.rows, ctx.cols)) return err(ERRORS.REF)
  return ctx.getCellValue(coordsToRef(row, col))
}

function resolveRangeCells(from: string, to: string, ctx: EvalContext): CellValue[] {
  const range = parseRange(from, to)
  return rangeCoords(range).map(({ row, col }) =>
    isOutOfBounds(row, col, ctx.rows, ctx.cols)
      ? err(ERRORS.REF)
      : ctx.getCellValue(coordsToRef(row, col)),
  )
}

/** Expande una expresión a una lista plana de valores (rangos -> sus celdas). */
function argValues(expr: Expr, ctx: EvalContext): CellValue[] {
  if (expr.t === 'range') return resolveRangeCells(expr.from, expr.to, ctx)
  if (expr.t === 'ref') return [resolveRef(expr.ref, ctx)]
  return [evaluate(expr, ctx)]
}

function collect(args: Expr[], ctx: EvalContext): CellValue[] {
  return args.flatMap((a) => argValues(a, ctx))
}

const scalarText = (v: ScalarValue | null): string =>
  v === null ? '' : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(v)

function comparePair(a: unknown, b: unknown): 'lt' | 'eq' | 'gt' {
  const na = toNumber(a)
  const nb = toNumber(b)
  if (na !== null && nb !== null) {
    if (na < nb) return 'lt'
    if (na > nb) return 'gt'
    return 'eq'
  }
  const sa = scalarText(a as ScalarValue | null)
  const sb = scalarText(b as ScalarValue | null)
  const cmp = sa < sb ? 'lt' : sa > sb ? 'gt' : 'eq'
  return cmp
}

function evalComparison(op: BinaryOp, a: unknown, b: unknown): CellValue {
  const relation = comparePair(a, b)
  switch (op) {
    case '=':
    case '==':
      return bool(relation === 'eq')
    case '<>':
    case '!=':
      return bool(relation !== 'eq')
    case '<':
      return bool(relation === 'lt')
    case '>':
      return bool(relation === 'gt')
    case '<=':
      return bool(relation !== 'gt')
    case '>=':
      return bool(relation !== 'lt')
    default:
      return err(ERRORS.ERROR)
  }
}

function evalBinary(node: Extract<Expr, { t: 'binary' }>, ctx: EvalContext): CellValue {
  const left = evaluate(node.a, ctx)
  if (!left.ok) return left
  const right = evaluate(node.b, ctx)
  if (!right.ok) return right

  switch (node.op) {
    case '+': {
      if (typeof left.value === 'string' || typeof right.value === 'string') {
        const na = toNumber(left.value)
        const nb = toNumber(right.value)
        if (na !== null && nb !== null) return num(na + nb)
        return str(scalarText(left.value) + scalarText(right.value))
      }
      return num((toNumber(left.value) ?? 0) + (toNumber(right.value) ?? 0))
    }
    case '-':
    case '*':
    case '/':
    case '^': {
      const na = toNumber(left.value)
      const nb = toNumber(right.value)
      if (na === null || nb === null) return err(ERRORS.VALUE)
      let result: number
      switch (node.op) {
        case '-':
          result = na - nb
          break
        case '*':
          result = na * nb
          break
        case '/':
          if (nb === 0) return err(ERRORS.DIV)
          result = na / nb
          break
        default:
          if (na === 0 && nb < 0) return err(ERRORS.DIV)
          result = Math.pow(na, nb)
          break
      }
      return Number.isFinite(result) ? num(result) : err(ERRORS.VALUE)
    }
    case '&':
      return str(scalarText(left.value) + scalarText(right.value))
    default:
      return evalComparison(node.op, left.value, right.value)
  }
}

function evalIf(args: Expr[], ctx: EvalContext): CellValue {
  if (args.length !== 3) return err(ERRORS.VALUE)
  const cond = evaluate(args[0], ctx)
  if (!cond.ok) return cond
  const b = toBoolean(cond.value)
  if (b === null) return err(ERRORS.VALUE)
  return evaluate(b ? args[1] : args[2], ctx)
}

/** Alias en español de las funciones (la UI usa nombres en español). */
const FUNCTION_ALIASES: Record<string, string> = {
  SUMA: 'SUM',
  PROMEDIO: 'AVERAGE',
  CONTAR: 'COUNT',
  CONTARA: 'COUNTA',
  REDONDEAR: 'ROUND',
}

/** Funciones agregadas/helpers. `values` ya está aplanado y libre de errores. */
function applyAggregate(name: string, values: CellValue[]): CellValue {
  const fn = FUNCTION_ALIASES[name] ?? name
  const numbers = values
    .filter((v): v is CellValue & { ok: true; value: number } => v.ok && typeof v.value === 'number')
    .map((v) => v.value)
  const numericError = values.find((v) => !v.ok)

  const requireNumeric = (): number | CellValue => {
    const first = values[0]
    if (!first || !first.ok) return err(ERRORS.VALUE)
    const n = toNumber(first.value)
    return n === null ? err(ERRORS.VALUE) : n
  }

  switch (fn) {
    case 'SUM':
      if (numericError) return numericError
      return num(numbers.reduce((acc, n) => acc + n, 0))
    case 'AVERAGE':
      if (numericError) return numericError
      return numbers.length === 0 ? err(ERRORS.DIV) : num(numbers.reduce((a, b) => a + b, 0) / numbers.length)
    case 'MIN':
      if (numericError) return numericError
      return num(numbers.length === 0 ? 0 : Math.min(...numbers))
    case 'MAX':
      if (numericError) return numericError
      return num(numbers.length === 0 ? 0 : Math.max(...numbers))
    case 'COUNT':
      return num(numbers.length)
    case 'COUNTA':
      return num(values.filter((v) => !v.ok || v.value !== null).length)
    case 'ABS': {
      const n = requireNumeric()
      return typeof n === 'number' ? num(Math.abs(n)) : n
    }
    case 'ROUND': {
      const n = requireNumeric()
      if (typeof n !== 'number') return n
      const digitsVal = values[1]
      const digits = digitsVal && digitsVal.ok ? toNumber(digitsVal.value) : null
      if (digits === null) return err(ERRORS.VALUE)
      const factor = Math.pow(10, digits)
      return num(Math.round(n * factor) / factor)
    }
    case 'LEN':
      return num(scalarText(values[0] && values[0].ok ? values[0].value : null).length)
    case 'UPPER':
      return str(scalarText(values[0] && values[0].ok ? values[0].value : null).toUpperCase())
    case 'LOWER':
      return str(scalarText(values[0] && values[0].ok ? values[0].value : null).toLowerCase())
    case 'PI':
      return num(Math.PI)
    case 'AND': {
      const bs = values.map((v) => (v.ok ? toBoolean(v.value) : null))
      if (bs.some((b) => b === null)) return err(ERRORS.VALUE)
      return bool((bs as boolean[]).reduce((acc, b) => acc && b, true))
    }
    case 'OR': {
      const bs = values.map((v) => (v.ok ? toBoolean(v.value) : null))
      if (bs.some((b) => b === null)) return err(ERRORS.VALUE)
      return bool((bs as boolean[]).reduce((acc, b) => acc || b, false))
    }
    default:
      return err(ERRORS.NAME)
  }
}

export function evaluate(expr: Expr, ctx: EvalContext): CellValue {
  switch (expr.t) {
    case 'num':
      return num(expr.value)
    case 'str':
      return str(expr.value)
    case 'bool':
      return bool(expr.value)
    case 'ref':
      return resolveRef(expr.ref, ctx)
    case 'range': {
      const cells = resolveRangeCells(expr.from, expr.to, ctx)
      return cells[0] ?? { ok: true, value: null }
    }
    case 'fn': {
      if (expr.name === 'IF' || expr.name === 'SI') return evalIf(expr.args, ctx)
      return applyAggregate(expr.name, collect(expr.args, ctx))
    }
    case 'binary':
      return evalBinary(expr, ctx)
    case 'unary': {
      const v = evaluate(expr.a, ctx)
      if (!v.ok) return v
      if (expr.op === '-') {
        const n = toNumber(v.value)
        return n === null ? err(ERRORS.VALUE) : num(-n)
      }
      const b = toBoolean(v.value)
      return b === null ? err(ERRORS.VALUE) : bool(!b)
    }
    case 'percent': {
      const v = evaluate(expr.a, ctx)
      if (!v.ok) return v
      const n = toNumber(v.value)
      return n === null ? err(ERRORS.VALUE) : num(n / 100)
    }
    case 'error':
      return err(expr.code)
  }
}