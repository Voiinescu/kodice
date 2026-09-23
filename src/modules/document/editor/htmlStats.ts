/** Métricas de texto a partir del HTML del editor (para la barra de estado). */

const reuse = () => {
  const div = document.createElement('div')
  return (html: string) => {
    div.innerHTML = html
    return div.innerText ?? ''
  }
}

const toText = reuse()

/** Extrae el texto plano (sin etiquetas) del contenido del editor. */
export function textFromHtml(html: string): string {
  return toText(html)
}

export function countWords(html: string): number {
  const text = textFromHtml(html).trim()
  if (!text) return 0
  return text.split(/\s+/).length
}

export function countCharacters(html: string): number {
  return textFromHtml(html).length
}

export function countCharactersNoSpaces(html: string): number {
  return textFromHtml(html).replace(/\s/g, '').length
}