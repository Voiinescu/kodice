# Folio — Suite ofimática ligera

Aplicación web *single-page* con un **editor de texto** tipo Word y una **hoja de cálculo** tipo Excel, todo en el navegador, sin backend y sin cuentas. Pensada para quien necesita anotar, organizar y calcular con elegancia, sin abrir una aplicación de escritorio.

![Versión](https://img.shields.io/badge/versión-0.1.0-blue?style=flat-square)
![Stack](https://img.shields.io/badge/React+TS+Vite-6.2%2F5.7-blueviolet?style=flat-square)
![Estado del build](https://img.shields.io/badge/build-pasando-brightgreen?style=flat-square)
![Licencia](https://img.shields.io/badge/licencia-privada-lightgrey?style=flat-square)

---

## Tabla de contenidos

1. [Capturas](#capturas)
2. [Descripción y motivación](#descripción-y-motivación)
3. [Características](#características)
4. [Stack tecnológico](#stack-tecnológico)
5. [Instalación](#instalación)
6. [Uso en desarrollo y build](#uso-en-desarrollo-y-build)
7. [Estructura del proyecto](#estructura-del-proyecto)
8. [Roadmap](#roadmap)
9. [Contribuir](#contribuir)
10. [Licencia](#licencia)

---

## Capturas

> Los placeholders se sustituirán por capturas reales en cuanto tengamos un entorno de despliegue.

| Editor de texto | Hoja de cálculo |
| --- | --- |
| ![Editor de texto — placeholder](./docs/screenshots/document.png) | ![Hoja de cálculo — placeholder](./docs/screenshots/spreadsheet.png) |

---

## Descripción y motivación

Folio nace de una idea simple: **las herramientas ofimáticas no deberían requerir instalación ni conexión**. Muchas veces solo necesitas redactar una nota con formato limpio o hacer un cálculo rápido con un par de fórmulas — y eso debería vivir donde ya estás: el navegador.

El proyecto combina dos piezas que suelen ser territorio de librerías pesadas — un editor WYSIWYG y un motor de fórmulas — implementadas de forma ligera y comprensible, con persistencia automática en `localStorage` y foco en la experiencia visual (pensada con la estética de *Notion + Google Docs*, no de las suites clásicas).

## Características

### Editor de texto (tipo Word)

- Editor **WYSIWYG** basado en `contenteditable` con barra de herramientas clásica.
- Formato inline: **negrita**, *cursiva*, <u>subrayado</u>, ~~tachado~~, colores de texto y resaltado.
- Bloques: párrafo, encabezados **H1–H4**, citas, código, listas con viñetas y numeradas.
- Alineación izquierda / centrada / derecha / **justificada**.
- Tablas simples editables e inserción de **imágenes** (incrustadas como *data URL*).
- **Deshacer / rehacer** con histórico propio (ráfagas agrupadas), no dependiente de `execCommand`.
- **Contador de palabras y caracteres** en tiempo real.
- Autoguardado local con *debounce* y guardado al cerrar la pestaña.
- Exportar a **.docx** (`docx`), **.pdf** (impresión del navegador) y **.json** (formato propio); importar desde **.json**.

### Hoja de cálculo (tipo Excel)

- Grid editable de **50 filas × 20 columnas** por defecto, **expandible** sobre la marcha.
- **Motor de fórmulas propio** (sin dependencias): aritmética, comparaciones, porcentajes y concatenación.
- Funciones en inglés y español: `SUM/SUMA`, `AVERAGE/PROMEDIO`, `MIN`, `MAX`, `COUNT/CONTAR`, `IF/SI`, `ABS`, `ROUND`, `LEN`, `UPPER`, `LOWER`, `AND`, `OR`, `COUNTA`.
- Referencias relativas y absolutas (`A1`, `$A$1`, rangos `A1:A10`).
- **Recálculo automático** con orden topológico y detección de referencias circulares (`#CIRC!`).
- Formato de celdas: negrita, cursiva, color de texto y relleno, alineación, numérico / moneda / porcentaje y bordes.
- **Ancho de columna** ajustable arrastrando el borde.
- **Ordenar** ascendente / descendente y **filtrar** por valores de columna.
- Selección múltiple, **copiar / pegar** (interno y portapapeles del sistema) y **relleno inteligente** (*fill handle*) que desplaza referencias relativas.
- **Deshacer / rehacer** (`Ctrl+Z` / `Ctrl+Shift+Z`) con historial de hasta 100 acciones, disponible en barra y teclado.
- Exportar a **.xlsx** (`xlsx`), **.csv** y **.json**.

### General

- **Launcher** elegante: documento nuevo, hoja nueva, plantillas de ejemplo y recientes.
- Lista de **archivos recientes** con su tipo, fecha y opción de eliminar.
- **Modo claro / oscuro** persistente (respeta `prefers-color-scheme`).
- Indicador de **espacio usado** en el almacenamiento local.
- **Responsive**: funciona bien en escritorio y tablet.
- Rutas con *hash* (`#/documento/:id`) para funcionar incluso abriendo el `dist/` desde `file://`.

## Stack tecnológico

- **React 18** + **TypeScript 5**
- **Vite 5** (herramienta de build) y **Vitest 2** (tests)
- **Tailwind CSS 3** con dark mode por clase
- **react-router-dom** (rutas, HashRouter)
- **docx** — exportación a Word; **xlsx** (SheetJS) — exportación a Excel
- **lucide-react** — iconografía, y **@fontsource-variable/inter** — tipografía
- Sin backend: persistencia en `localStorage` (índice `folio.meta` + archivos `folio.file.<id>`)

## Instalación

Requisitos previos:

- [Node.js](https://nodejs.org) ≥ 18 (incluye `npm`)
- Git

Pasos:

```bash
# 1. Clonar el repositorio
git clone https://github.com/Voiinescu/kodice.git
cd kodice

# 2. Instalar dependencias
npm install

# 3. (Opcional) variables de entorno
# No se requiere ninguna. El proyecto funciona 100 % offline sin config.
```

## Uso en desarrollo y build

```bash
# Desarrollo con recarga en caliente → http://localhost:5173
npm run dev

# Compilación de producción → dist/
npm run build

# Previsualizar la build localmente
npm run preview
```

Scripts de calidad:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint, 0 avisos permitidos
npm run test        # vitest (motor de fórmulas, recálculo, transformaciones, geometría, TSV)
npm run check       # typecheck + lint + test de una vez
```

## Estructura del proyecto

```
src/
├── main.tsx / App.tsx            # arranque, proveedores y rutas
├── types/file.ts                 # modelos compartidos (FileRecord, SpreadsheetCell, CellFormat…)
├── utils/                        # storage, ids, descarga, fechas, TSV, bytes
├── hooks/                        # hooks compartidos (useClickOutside)
├── components/                   # UI reusable: barra de herramientas, menús, modales, toasts, tema
│   ├── ThemeProvider.tsx         # tema claro/oscuro persistente
│   ├── WorkspaceHeader.tsx       # cabecera con título editable y estado de guardado
│   ├── feedback/                 # sistema de notificaciones (toasts)
│   └── ui/                       # ToolbarButton, Menu, Modal, ColorField
├── pages/Launcher.tsx            # pantalla de inicio
└── modules/
    ├── document/                 # editor de texto (comandos, historial, export DOCX/PDF/JSON)
    │   └── export/export{Docx,Pdf}.ts
    └── spreadsheet/
        ├── SpreadsheetView.tsx   # contenedor: carga, guardado, exportación
        ├── SheetGrid.tsx         # grid virtualizado e interacción (fill handle, copiar/pegar)
        ├── FormulaBar.tsx        # barra de fórmulas
        ├── SpreadsheetToolbar.tsx# formato, orden y filtros
        ├── state/reducer.ts      # reducer puro (escritura, orden, filtro, formato)
        └── engines/              # lógica desacoplada y testeada
            ├── formula/          # tokenizer, parser, ast, evaluator
            ├── calc.ts           # recálculo con detección de ciclos
            ├── cellRef.ts        # refs A1 ⇄ coordenadas
            ├── cell.ts           # literales e interpretación tipo Excel
            ├── cellTransform.ts  # copiar / rellenar con desplazamiento de refs
            ├── gridGeometry.ts   # medidas y columnas visibles
            └── formats.ts        # impresión de celdas y números
```

**Diseño clave:** la lógica de negocio (motor de fórmulas, transformaciones de celdas, exportadores) vive en `engines/` y `export/`, separada de la UI (vistas y componentes). Cada pieza del motor es una función pura y testeable.

## Roadmap

Ideas ordenadas por prioridad:

- [ ] Importar **CSV** y contenido desde portapapeles externo con mapeo de columnas.
- [ ] Múltiples **hojas** por libro (pestañas inferiores tipo Excel).
- [ ] Fórmulas con **referencias cruzadas entre hojas** y más funciones (`HOY`, `SUMAPRODUCTO`).
- [ ] Exportación DOCX con estilos de tabla y encabezados más ricos.
- [ ] Estilos visuales en la exportación **XLSX** (SheetJS no los incluye por defecto).
- [ ] Historial de **versiones** por documento con restauración.
- [ ] **PWA**: instalable y con soporte *offline* total.
- [ ] Migración de persistencia a **IndexedDB** para archivos más grandes (imágenes).

## Contribuir

Las contribuciones son bienvenidas. Para mantener el proyecto limpio:

1. Abre un *issue* o comenta tu propuesta antes de empezar.
2. Sigue las convenciones del código: nombres descriptivos en inglés, comentarios solo donde la lógica no sea obvia, y **lógica de negocio separada de la UI**.
3. Ejecuta `npm run check` antes de abrir el PR; debe pasar sin errores.
4. Documenta el cambio en `CHANGELOG.md` bajo la sección *[No publicado]* con el formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## Licencia

**Privado / uso interno.** Todo el código de este repositorio es propiedad del autor y no puede redistribuirse sin permiso.