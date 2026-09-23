/**
 * Tokenizador del lenguaje de fórmulas.
 *
 * Convierte una cadena como `SUM(A1:A10)*2+"IVA"` en una secuencia de tokens.
 * Cada token conserva su texto original (`raw`) para poder reconstruir la
 * fórmula con referencias desplazadas al copiar/rellenar celdas.
 */

export type FormulaToken =
  | { type: 'number'; value: number; raw: string }
  | { type: 'string'; value: string; raw: string }
  | { type: 'name'; value: string; raw: string }
  | { type: 'ref'; value: string; raw: string }
  | { type: 'bool'; value: boolean; raw: string }
  | { type: 'op'; value: string; raw: string }

const NAME_START = /[A-Za-z_]/
const COL_LETTERS = /^[A-Za-z]{1,3}$/

/** Comprueba si un nombre es realmente una referencia de celda (p.ej. "B3"). */
function looksLikeRef(text: string): boolean {
  const m = /^(\$?)([A-Za-z]+)(\$?)([0-9]+)$/.exec(text)
  if (!m) return false
  return COL_LETTERS.test(m[2])
}

export function tokenize(input: string): FormulaToken[] {
  const tokens: FormulaToken[] = []
  let i = 0
  const src = input

  while (i < src.length) {
    const ch = src[i]

    if (/\s/.test(ch)) {
      i += 1
      continue
    }

    // Número (entero, decimal o notación científica)
    if (/[0-9.]/.test(ch) && (/\d/.test(ch) || (ch === '.' && /\d/.test(src[i + 1] ?? '')))) {
      const m = /^(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i))
      if (!m) {
        tokens.push({ type: 'op', value: ch, raw: ch })
        i += 1
        continue
      }
      tokens.push({ type: 'number', value: Number(m[0]), raw: m[0] })
      i += m[0].length
      continue
    }

    // Cadena "entre comillas"
    if (ch === '"') {
      const end = src.indexOf('"', i + 1)
      if (end === -1) throw formulaError(`cadena sin cerrar en la posición ${i}`)
      const inner = src.slice(i + 1, end)
      tokens.push({ type: 'string', value: inner, raw: src.slice(i, end + 1) })
      i = end + 1
      continue
    }

    // Referencia de celda (con ':' para rangos) o nombre (función / constante)
    if (NAME_START.test(ch) || ch === '$') {
      const rest = src.slice(i)
      const refMatch = /^\$?[A-Za-z]{1,3}\$?[0-9]+/.exec(rest)
      if (refMatch && looksLikeRef(refMatch[0])) {
        tokens.push({ type: 'ref', value: refMatch[0].toUpperCase(), raw: refMatch[0] })
        i += refMatch[0].length
        continue
      }
      const nameMatch = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(rest)
      if (nameMatch) {
        const rawName = nameMatch[0]
        const upper = rawName.toUpperCase()
        if (upper === 'TRUE' || upper === 'VERDADERO') {
          tokens.push({ type: 'bool', value: true, raw: rawName })
        } else if (upper === 'FALSE' || upper === 'FALSO') {
          tokens.push({ type: 'bool', value: false, raw: rawName })
        } else {
          tokens.push({ type: 'name', value: upper, raw: rawName })
        }
        i += rawName.length
        continue
      }
      throw formulaError(`carácter inesperado "${ch}" en la posición ${i}`)
    }

    // Operadores de 2 caracteres y de 1
    const two = src.slice(i, i + 2)
    if (['<=', '>=', '<>', '!=', '=='].includes(two)) {
      tokens.push({ type: 'op', value: two, raw: two })
      i += 2
      continue
    }
    if ('+-*/^%()=,<>:&!'.includes(ch)) {
      tokens.push({ type: 'op', value: ch, raw: ch })
      i += 1
      continue
    }

    throw formulaError(`carácter inesperado "${ch}" en la posición ${i}`)
  }

  return tokens
}

export function formulaError(message: string): FormulaSyntaxError {
  const error = new Error(message) as FormulaSyntaxError
  error.name = 'FormulaError'
  return error
}

export interface FormulaSyntaxError extends Error {
  name: 'FormulaError'
}