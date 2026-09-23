/**
 * Capa fina sobre document.execCommand.
 *
 * execCommand está oficialmente "deprecated", pero sigue siendo la forma más
 * robusta y universalmente soportada de aplicar formato WYSIWYG a un
 * contenteditable sin arrastrar librerías (Quill, TipTap, Slate…). Todo su
 * comportamiento aquí se controla o envuelve; ninguna otra parte depende de la
 * API del navegador directamente.
 */

export function execFormat(command: string, value?: string): void {
  document.execCommand(command, false, value ?? '')
}

export function queryFormatState(command: string): boolean {
  try {
    return document.queryCommandState(command)
  } catch {
    return false
  }
}

/** Valor actual de un comando (p.ej. formatBlock -> "H1"); cadena normalizada. */
export function queryFormatValue(command: string): string {
  try {
    return (document.queryCommandValue(command) ?? '').toString().toLowerCase()
  } catch {
    return ''
  }
}

export function tableHtml(rows: number, cols: number): string {
  const head = `<tr>${Array.from({ length: cols }, () => '<th><br></th>').join('')}</tr>`
  const body = Array.from(
    { length: rows },
    () => `<tr>${Array.from({ length: cols }, () => '<td><br></td>').join('')}</tr>`,
  ).join('')
  return `<table><thead>${head}</thead><tbody>${body}</tbody></table><p><br></p>`
}

/** Lista de bloques soportados por formatBlock con su etiqueta en el menú. */
export const BLOCK_LABELS: { value: string; label: string }[] = [
  { value: 'p', label: 'Texto normal' },
  { value: 'h1', label: 'Título 1' },
  { value: 'h2', label: 'Título 2' },
  { value: 'h3', label: 'Título 3' },
  { value: 'h4', label: 'Título 4' },
  { value: 'blockquote', label: 'Cita' },
  { value: 'pre', label: 'Código' },
]