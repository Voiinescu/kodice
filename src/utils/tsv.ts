/**
 * TSV — representación tabular usada para copiar/pegar entre aplicaciones
 * (Excel, Google Sheets, LibreOffice) y dentro de la propia hoja.
 * Se separan celdas con tabuladores y filas con saltos de línea, escapando
 * comillas al estilo CSV cuando una celda contiene comillas o tabuladores.
 */

const escapeCell = (value: string): string => {
  if (/[\t\n"]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function toTsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCell).join('\t')).join('\r\n')
}

export function fromTsv(text: string): string[][] {
  if (!text) return []
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => {
      const out: string[] = []
      let cur = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (inQuotes) {
          if (ch === '"') {
            if (line[i + 1] === '"') {
              cur += '"'
              i++
            } else {
              inQuotes = false
            }
          } else {
            cur += ch
          }
        } else if (ch === '"') {
          inQuotes = true
        } else if (ch === '\t') {
          out.push(cur)
          cur = ''
        } else {
          cur += ch
        }
      }
      out.push(cur)
      return out
    })
}