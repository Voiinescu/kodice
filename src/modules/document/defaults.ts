/** Contenido HTML inicial (en blanco) para documentos nuevos. */
export const EMPTY_DOCUMENT_HTML = '<p><br></p>'

/** Plantilla de bienvenida usada por el launcher (opción "Plantilla de ejemplo"). */
export const SAMPLE_DOCUMENT_HTML = `
<h1>Bienvenido a Folio</h1>
<p>Este es un <strong>documento de demostración</strong> creado para que explores el editor. Todo el
texto, los estilos y las imágenes se guardan automáticamente en tu navegador, sin necesidad de
cuenta ni conexión.</p>
<h2>Formato de texto</h2>
<p>Puedes aplicar <strong>negrita</strong>, <em>cursiva</em>, <u>subrayado</u>, <s>tachado</s> y
<a href="https://example.com">enlaces</a>. Las alineaciones, colores de texto y resaltados están en
la barra de herramientas.</p>
<blockquote>“La simplicidad es la sofisticación máxima.” — Leonardo da Vinci</blockquote>
<h2>Listas y tablas</h2>
<ul>
  <li>Listas con viñetas</li>
  <li>Guarda, exporta a <code>.docx</code> o imprime a PDF</li>
</ul>
<ol>
  <li>Primero redacta</li>
  <li>Después usa <code>Ctrl+Z</code> para deshacer con confianza</li>
</ol>
<table>
  <thead><tr><th>Funcionalidad</th><th>Estado</th></tr></thead>
  <tbody>
    <tr><td>Autoguardado</td><td>Activo</td></tr>
    <tr><td>Exportar DOCX / PDF</td><td>Disponible</td></tr>
  </tbody>
</table>
<h2>Imágenes</h2>
<p>Usa el icono de imagen en la barra para insertar una foto desde tu equipo. Todo queda incrustado
en el propio documento.</p>
<p><br></p>
`

export function createEmptyDocument(): { html: string } {
  return { html: EMPTY_DOCUMENT_HTML }
}

export function createSampleDocument(): { html: string } {
  return { html: SAMPLE_DOCUMENT_HTML }
}

export const DEFAULT_DOCUMENT_NAME = 'Documento sin título'