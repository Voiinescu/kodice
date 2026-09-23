/** Sanitiza un nombre de archivo para escritura (evita caracteres conflictivos). */
export function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'sin-titulo'
}

const downloadUrl = (url: string, filename: string) => {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** Descarga un Blob generado en cliente (docx, xlsx, csv, json, etc.). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  downloadUrl(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function downloadBlobFromBuffer(buffer: ArrayBuffer, mime: string, filename: string): void {
  downloadBlob(new Blob([buffer], { type: mime }), filename)
}

export function downloadText(text: string, mime: string, filename: string): void {
  downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename)
}

/** Descarga un string plano como .txt/.md/etc. */
export function downloadString(text: string, filename: string, mime = 'text/plain'): void {
  downloadText(text, mime, filename)
}