# Registro de cambios

Todos los cambios notables de **Folio** se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

## [No publicado]

### Añadido
- Lanzador con plantillas, documentos recientes, indicador de espacio usado y borrado con confirmación.
- Hoja de cálculo: grid virtualizado, relleno inteligente, ordenar, filtrar, formato y exportación XLSX/CSV/JSON.
- Motor de fórmulas propio con funciones en inglés y español (SUMA, PROMEDIO, CONTAR, SI/REDONDEAR, ABS, MAX/MIN, …).
- Recálculo automático con orden topológico y detección de referencias circulares (`#CIRC!`).
- Editor de texto: bloques, formato inline, alineación, listas, enlaces, imágenes y exportación a DOCX/PDF/texto.
- Autoguardado con *debounce* (400 ms) y guardado al cerrar la pestaña; renombrado de documentos.
- Tema claro/oscuro persistente y rutas con hash para funcionar en `file://`.
- Suite de pruebas del motor (Vitest) y scripts de calidad (`npm run check`).

### Corregido
- El recálculo (`applyRecalc`) no aplicaba los valores porque iteraba un `Map` con `Object.keys` (solo se recalculaba la plantilla de ejemplo). Corregido iterando la propia instancia del `Map`.
- El parser rechazaba funciones sin argumentos y no podía leer el primer argumento cuando era una expresión simple.
- Faltaban alias en español para varias funciones; se añadieron `SUMA`, `PROMEDIO`, `CONTAR`, `CONTARA` y `REDONDEAR`.
- Importaciones relativas incorrectas en varios módulos de hoja de cálculo y del editor (fallos de `tsc`).
- Errores de tipos en la exportación DOCX (ejecución de texto, subrayado y niveles de lista) y en `exportPdf`.
- `createNewFile` no escribía el discriminador `type` en los registros guardados.
- El botón **Justificar** de alineación no estaba accesible en la barra del editor de texto (el motor ya lo soportaba).
- Los botones **Negrita / Cursiva** de la hoja de cálculo no reflejaban el estado activo de la celda seleccionada (siempre aparecían inactivos).

### Notas técnicas
- El despliegue de la build supera los 500 kB de JS (componente único); se puede reducir con *chunking* manual si se desea.

## [0.1.0] - 2026

### Añadido
- Versión inicial: arranque del proyecto (Vite + React + TS + Tailwind), estructura base del editor de texto y de la hoja de cálculo.