/**
 * Exportador .docx (librería `docx`).
 *
 * Estrategia: el HTML del editor se transforma en un árbol de "bloques" de
 * docx (Paragraph / Table / ImageRun) recorriendo el DOM con el DOMParser del
 * navegador. El proceso es puramente funcional:
 *
 *   1. `inlineRuns(node, style)` -> lista de IRun (TextRun, ExternalHyperlink).
 *      Acumula negrita/cursiva/subrayado/tachado/color por anidación y por el
 *      atributo `style` de cada <span>.
 *   2. `blockToChildren(node)`  -> bloques de docx a partir de elementos de
 *      nivel de bloque (h1..h4, p, li, blockquote, pre, table, imagen).
 *   3. Listas con el objeto `numbering` del Document (referencias
 *      'ordered-list' y 'bullet-list' con 3 niveles de sangría).
 *
 * Limitación conocida (ver README): solo se embeben imágenes dataURL; los
 * enlaces NO se convierten en hipervínculos activos, se imprimen subrayados.
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
  type IRun,
} from 'docx'
import { downloadBlob, sanitizeFileName } from '../../../utils/download'

interface RunStyleData {
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  color?: string
  highlight?: string
}

const BASE_STYLE: RunStyleData = { bold: false, italic: false, underline: false, strike: false }

/** Traduce un color CSS (#hex o rgb()) a la cadena hex exigida por docx. */
function cssColorToHex(value: string | null): string | undefined {
  if (!value) return undefined
  const hex = /^#([0-9a-fA-F]{6})$/.exec(value.trim())
  if (hex) return hex[1].toUpperCase()
  const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value.trim())
  if (rgb) {
    return [rgb[1], rgb[2], rgb[3]]
      .map((part) => Number(part).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  }
  return undefined
}

/** Añade al estilo heredado lo que declara el atributo style de un <span>. */
function styleAttr(el: Element, style: RunStyleData): RunStyleData {
  const css = (el as HTMLElement).style
  const next: RunStyleData = { ...style }
  const color = cssColorToHex(css.color)
  if (color) next.color = color
  const bg = cssColorToHex(css.backgroundColor)
  if (bg) next.highlight = bg
  if (css.fontWeight === 'bold' || css.fontWeight === '700') next.bold = true
  if (css.fontStyle === 'italic') next.italic = true
  if (css.textDecoration.includes('underline')) next.underline = true
  if (css.textDecoration.includes('line-through')) next.strike = true
  return next
}

/** Estilo aportado por la propia etiqueta (strong, em, u, s...). */
function tagStyle(tag: string, style: RunStyleData): RunStyleData {
  const next: RunStyleData = { ...style }
  if (tag === 'STRONG' || tag === 'B') next.bold = true
  else if (tag === 'EM' || tag === 'I') next.italic = true
  else if (tag === 'U') next.underline = true
  else if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') next.strike = true
  return next
}

/** Un texto con '\n' se convierte en varios TextRun separados por break. */
function textRuns(text: string, style: RunStyleData): TextRun[] {
  const segments = text.split('\n')
  return segments.flatMap((segment, i) => {
    const run = new TextRun({
      text: segment,
      bold: style.bold,
      italics: style.italic,
      underline: style.underline ? UnderlineType.single : undefined,
      strike: style.strike,
      color: style.color,
      highlight: style.highlight,
    })
    return i === 0 ? [run] : [new TextRun({ break: 1 }), run]
  })
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Una imagen dataURL del documento se incrusta como ImageRun. */
function imageRun(el: Element): ImageRun {
  const src = el.getAttribute('src') ?? ''
  const m = /^data:(image\/(?:png|jpeg|webp|gif|bmp));base64,(.+)$/.exec(src)
  const rawType = (m?.[1] ?? 'png') as string
  const type = (rawType === 'image/jpeg' ? 'jpg' : rawType.replace('image/', '')) as 'png' | 'jpg' | 'gif' | 'bmp'
  const data = m ? base64ToBytes(m[2]) : new Uint8Array()
  const defaultWidth = 560
  const width = parseFloat((el as HTMLElement).style.width) || defaultWidth
  const height = parseFloat((el as HTMLElement).style.height) || Math.round(width * 0.6)
  return new ImageRun({ type, data, transformation: { width, height } })
}

const ALIGN_MAP: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
}

const HEADING_MAP: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  H1: HeadingLevel.HEADING_1,
  H2: HeadingLevel.HEADING_2,
  H3: HeadingLevel.HEADING_3,
  H4: HeadingLevel.HEADING_4,
}

/** Convierte un subárbol inline (texto, strong, span, a, img...) en runs. */
function inlineRuns(node: Node, style: RunStyleData): IRun[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return textRuns(node.textContent ?? '', style)
  }
  const el = node as Element
  const tag = el.tagName.toUpperCase()

  if (tag === 'BR') return [new TextRun({ break: 1 })]
  if (tag === 'IMG') return [imageRun(el)]

  if (tag === 'A') {
    const href = el.getAttribute('href') ?? ''
    const children = Array.from(el.childNodes).flatMap((c) => inlineRuns(c, { ...style, underline: true }))
    if (/^https?:\/\//i.test(href)) {
      return [new ExternalHyperlink({ link: href, children })]
    }
    return children
  }

  const next = tagStyle(tag, styleAttr(el, style))
  return Array.from(el.childNodes).flatMap((c) => inlineRuns(c, next))
}

function paragraphProps(
  el: Element,
  children: IRun[],
  depth: number,
): ConstructorParameters<typeof Paragraph>[0] {
  const css = (el as HTMLElement).style
  const align = css.textAlign || el.getAttribute('align') || ''
  const heading = HEADING_MAP[el.tagName.toUpperCase()]
  return {
    children,
    ...(heading ? { heading } : {}),
    ...(ALIGN_MAP[align] ? { alignment: ALIGN_MAP[align] } : {}),
    ...(depth > 0 ? { indent: { left: 360 * depth, hanging: 180 } } : {}),
  }
}

/** Traduce un nodo de nivel de bloque a hijos de sección de docx. */
function blockToChildren(node: Node, depth: number): (Paragraph | Table)[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return [new Paragraph({ children: textRuns(node.textContent ?? '', BASE_STYLE) })]
  }
  const el = node as Element
  const tag = el.tagName.toUpperCase()

  if (['H1', 'H2', 'H3', 'H4', 'P'].includes(tag)) {
    const runs = Array.from(el.childNodes).flatMap((c) => inlineRuns(c, BASE_STYLE))
    return [new Paragraph(paragraphProps(el, runs, depth))]
  }
  if (tag === 'BLOCKQUOTE') {
    const runs = Array.from(el.childNodes).flatMap((c) => inlineRuns(c, { ...BASE_STYLE, italic: true }))
    return [
      new Paragraph({
        children: runs,
        indent: { left: 720, right: 360 },
        spacing: { before: 120, after: 120 },
      }),
    ]
  }
  if (tag === 'PRE') {
    const runs = Array.from(el.childNodes).flatMap((c) => inlineRuns(c, BASE_STYLE))
    return [new Paragraph({ children: runs, style: 'Code' })]
  }
  if (tag === 'UL' || tag === 'OL') {
    const reference = tag === 'OL' ? 'ordered-list' : 'bullet-list'
    return Array.from(el.children)
      .filter((c) => c.tagName.toUpperCase() === 'LI')
      .flatMap((li) => {
        const paragraphs: (Paragraph | Table)[] = []
        for (const child of Array.from(li.childNodes)) {
          const childTag = (child as Element).tagName?.toUpperCase()
          if (childTag === 'UL' || childTag === 'OL') {
            paragraphs.push(...blockToChildren(child, depth + 1))
          } else {
            const runs = Array.from(child.childNodes).flatMap((c) => inlineRuns(c, BASE_STYLE))
            paragraphs.push(
              new Paragraph({
                numbering: { reference, level: Math.min(depth, 2) },
                children: runs,
              }),
            )
          }
        }
        return paragraphs
      })
  }
  if (tag === 'TABLE') {
    return [tableToDocx(el)]
  }
  if (tag === 'HR') {
    return [new Paragraph({ children: [new TextRun({ text: '' })] })]
  }
  // Párrafo genérico para cualquier otro bloque (div, section...)
  const runs = Array.from(el.childNodes).flatMap((c) => inlineRuns(c, BASE_STYLE))
  return [new Paragraph(paragraphProps(el, runs, depth))]
}

/** Tabla HTML -> docx Table con cabecera sombreada y bordes sutiles. */
function tableToDocx(table: Element): Table {
  const headerCells = new Set<Element>()
  table.querySelectorAll(':scope > thead th').forEach((th) => headerCells.add(th))

  const rows = Array.from(table.querySelectorAll(':scope > thead > tr, :scope > tbody > tr')).map((tr) => {
    const cells = Array.from(tr.children).filter(
      (c) => c.tagName.toUpperCase() === 'TH' || c.tagName.toUpperCase() === 'TD',
    )
    const docxCells = cells.map((cell) => {
      const isHeader = headerCells.has(cell)
      const children = Array.from(cell.childNodes).flatMap((c): (Paragraph | Table)[] => {
        if (c.nodeType === Node.TEXT_NODE) {
          return [new Paragraph({ children: textRuns(c.textContent ?? '', BASE_STYLE) })]
        }
        return blockToChildren(c, 0)
      })
      return new TableCell({
        shading: isHeader ? { fill: 'EEF2FF' } : undefined,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: 'D8DEE9' },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D8DEE9' },
          left: { style: BorderStyle.SINGLE, size: 4, color: 'D8DEE9' },
          right: { style: BorderStyle.SINGLE, size: 4, color: 'D8DEE9' },
        },
        children,
      })
    })
    return new TableRow({ children: docxCells })
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  })
}

function listConfig(reference: string, format: (typeof LevelFormat)[keyof typeof LevelFormat]) {
  return {
    reference,
    levels: Array.from({ length: 3 }, (_, level) => ({
      level,
      format,
      text: format === LevelFormat.BULLET ? '•' : `%${level + 1}.`,
      alignment: AlignmentType.LEFT,
      style: {
        paragraph: {
          indent: { left: 720 + 360 * level, hanging: 360 },
        },
      },
    })),
  }
}

/** Genera y descarga el .docx. Las imágenes se incrustan; ver notas del README. */
export async function exportDocumentDocx(name: string, html: string): Promise<void> {
  const body = new DOMParser().parseFromString(html, 'text/html').body
  const children = Array.from(body.childNodes).flatMap((c) => blockToChildren(c, 0))

  const doc = new Document({
    numbering: {
      config: [
        listConfig('ordered-list', LevelFormat.DECIMAL),
        listConfig('bullet-list', LevelFormat.BULLET),
      ],
    },
    sections: [{ children }],
  })

  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, `${sanitizeFileName(name)}.docx`)
}