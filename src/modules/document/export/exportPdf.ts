/**
 * Exportación a PDF vía impresión del navegador.
 *
 * En lugar de simular un PDF recomponiendo el HTML (complejo y frágil con
 * tablas e imágenes), se abre una ventana de impresión oculta (iframe) con el
 * documento y el usuario elige "Guardar como PDF". El resultado conserva el
 * 100 % del formato tipográfico, es 0 dependencias y funciona en escritorio.
 */

const PRINT_STYLES = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: 'Inter Variable', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    color: #1e293b;
    font-size: 11pt;
    line-height: 1.6;
  }
  p { margin: 0.4em 0; }
  h1 { font-size: 1.9em; margin: 0.9em 0 0.45em; line-height: 1.25; }
  h2 { font-size: 1.5em; margin: 0.8em 0 0.4em; }
  h3 { font-size: 1.22em; margin: 0.7em 0 0.35em; }
  blockquote {
    margin: 0.7em 0; padding: 0.3em 0 0.3em 1em;
    border-left: 3px solid #cbd5e1; color: #475569; font-style: italic;
  }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.86em; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px;
    padding: 0.08em 0.34em;
  }
  pre { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 0.8em 1em; border-radius: 8px; overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; margin: 0.9em 0; }
  th, td { border: 1px solid #cbd5e1; padding: 0.45em 0.7em; text-align: left; vertical-align: top; }
  th { background: #eef2ff; font-weight: 600; }
  img { max-width: 100%; }
  a { color: #4338ca; }
`

function buildPrintDocument(name: string, html: string): string {
  const safeTitle = name.replace(/</g, '&lt;')
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${safeTitle}</title>
<style>${PRINT_STYLES}</style></head>
<body>${html}</body></html>`
}

export function exportDocumentPdf(name: string, html: string): void {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'
  iframe.srcdoc = buildPrintDocument(name, html)
  document.body.appendChild(iframe)

  const close = (): void => {
    setTimeout(() => iframe.remove(), 60_000)
  }

  iframe.addEventListener(
    'load',
    () => {
      const win = iframe.contentWindow
      if (!win) return close()
      win.focus()
      try {
        win.print()
      } catch {
        close()
      }
    },
    { once: true },
  )
}