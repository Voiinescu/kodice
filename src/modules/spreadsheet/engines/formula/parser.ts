/**
 * Parser de fórmulas por "precedence climbing" (Pratt).
 *
 * Estrategia: un único bucle decide, por precedencia, si el siguiente token
 * es un operador infijo que agrupa el lado izquierdo, un '%' postfijo que lo
 * convierte en porcentaje, o un ':' que convierte una referencia en un rango.
 * La asociatividad derecha de '^' se consigue pasando como precedencia mínima
 * del operando derecho la del propio '^'.
 *
 * La salida es un AST (ast.ts) que después recorre el evaluador.
 */

import {
  INFIX_PRECEDENCE,
  POSTFIX_PRECEDENCE,
  UNARY_PRECEDENCE,
  type BinaryOp,
  type Expr,
} from './ast'
import { formulaError, tokenize, type FormulaToken } from './tokenizer'
import { isCellRef } from '../cellRef'

class Parser {
  private pos = 0

  constructor(private readonly tokens: FormulaToken[]) {}

  private peek(): FormulaToken | undefined {
    return this.tokens[this.pos]
  }

  private next(): FormulaToken | undefined {
    return this.tokens[this.pos++]
  }

  parse(): Expr {
    if (this.tokens.length === 0) return { t: 'num', value: 0 }
    const result = this.expression(0)
    if (this.pos < this.tokens.length) {
      throw formulaError('tokens sobrantes al final de la fórmula')
    }
    return result
  }

  /** Precedence climbing central: un prefijo y luego infijos/postfijos. */
  private expression(minPrec: number): Expr {
    let left = this.prefix()

    for (;;) {
      const tok = this.peek()

      // '%' postfijo: une con prioridad máxima de postfijo.
      if (tok?.type === 'op' && tok.value === '%' && POSTFIX_PRECEDENCE >= minPrec) {
        this.next()
        left = { t: 'percent', a: left }
        continue
      }

      // ':' tras una referencia -> rango A1:B5
      if (tok?.type === 'op' && tok.value === ':' && left.t === 'ref') {
        this.next()
        const toTok = this.next()
        if (toTok?.type !== 'ref' || !isCellRef(toTok.value)) {
          throw formulaError(`se esperaba una referencia tras ':' (rango "${left.ref}:?")`)
        }
        left = { t: 'range', from: left.ref, to: toTok.value }
        continue
      }

      // Operador binario
      if (tok?.type !== 'op') break
      const prec = INFIX_PRECEDENCE[tok.value]
      if (prec === undefined || prec < minPrec) break

      this.next()
      const rightMin = tok.value === '^' ? prec : prec + 1
      const right = this.expression(rightMin)
      left = { t: 'binary', op: tok.value as BinaryOp, a: left, b: right }
    }

    return left
  }

  private expect(op: string): void {
    const tok = this.next()
    if (tok?.type !== 'op' || tok.value !== op) {
      throw formulaError(`se esperaba "${op}"`)
    }
  }

  private prefix(): Expr {
    const tok = this.next()
    if (!tok) throw formulaError('fórmula incompleta')

    switch (tok.type) {
      case 'number':
        return { t: 'num', value: tok.value }
      case 'string':
        return { t: 'str', value: tok.value }
      case 'bool':
        return { t: 'bool', value: tok.value }
      case 'ref':
        return { t: 'ref', ref: tok.value }
      case 'name':
        return this.parseFunction(tok.value)
      case 'op':
        switch (tok.value) {
          case '(': {
            const inner = this.expression(0)
            this.expect(')')
            return inner
          }
          case '-':
          case '+':
            return { t: 'unary', op: '-', a: this.expression(UNARY_PRECEDENCE) }
          case '!':
            return { t: 'unary', op: '!', a: this.expression(UNARY_PRECEDENCE) }
          default:
            throw formulaError(`operador "${tok.value}" sin operando`)
        }
      default:
        throw formulaError('expresión inesperada')
    }
  }

  private parseFunction(name: string): Expr {
    this.expect('(')
    const args: Expr[] = []
    while (this.peek() && this.peek()!.type === 'op' && this.peek()!.value !== ')') {
      args.push(this.expression(0))
      const sep = this.peek()
      if (sep?.type === 'op' && sep.value === ',') {
        this.next()
        continue
      }
      break
    }
    this.expect(')')
    return { t: 'fn', name, args }
  }
}

/** Punto de entrada público: texto de fórmula (sin el '=' inicial) -> AST. */
export function parseFormula(source: string): Expr {
  if (source.trim() === '') return { t: 'num', value: 0 }
  return new Parser(tokenize(source)).parse()
}