/**
 * AST del lenguaje de fórmulas. Los nodos ref/range conservan el texto
 * original (incluidos los marcadores '$') para poder desplazarlos al copiar.
 */

export type BinaryOp =
  | '+'
  | '-'
  | '*'
  | '/'
  | '^'
  | '&'
  | '='
  | '=='
  | '<>'
  | '!='
  | '<'
  | '>'
  | '<='
  | '>='

export type Expr =
  | { t: 'num'; value: number }
  | { t: 'str'; value: string }
  | { t: 'bool'; value: boolean }
  | { t: 'ref'; ref: string }
  | { t: 'range'; from: string; to: string }
  | { t: 'fn'; name: string; args: Expr[] }
  | { t: 'binary'; op: BinaryOp; a: Expr; b: Expr }
  | { t: 'unary'; op: '-' | '!'; a: Expr }
  | { t: 'percent'; a: Expr }
  | { t: 'error'; code: string }

export const INFIX_PRECEDENCE: Record<string, number> = {
  '&': 10,
  '=': 20,
  '==': 20,
  '<>': 20,
  '!=': 20,
  '<': 30,
  '>': 30,
  '<=': 30,
  '>=': 30,
  '+': 40,
  '-': 40,
  '*': 50,
  '/': 50,
  '^': 60, // asociativo a la derecha
}

/** '%' postfijo siempre se une más fuerte que cualquier operador binario. */
export const POSTFIX_PRECEDENCE = 70

/** Precedencia del prefijo unario ('-' y '!'). Debe quedar por debajo de '^'. */
export const UNARY_PRECEDENCE = 55