# Folio — Suite ofimática ligera

Aplicación web (SPA) de una **suite ofimática** en español con un editor de texto tipo *Word* y una hoja de cálculo tipo *Excel*. Todo funciona en el navegador: los documentos se guardan en `localStorage` y no se envía ningún dato a un servidor.

Desarrollada con React 18 + TypeScript + Vite.

## Características

### Hoja de cálculo
- Grid virtualizado de 50 columnas × 1000 filas con selección, desplazamiento, redimensionado de columnas y relleno inteligente (replica patrones y desplaza referencias relativas).
- **Motor de fórmulas** propio (sin dependencias): aritmética, comparaciones, unión de texto, porcentajes, referencias `A1`/`$A$1`/rangos `B2:D5` y funciones en inglés y español.
- **Recálculo automático** con orden topológico y detección de referencias circulares (`#CIRC!`).
- Edición en celda, copiar/pegar/rellenar desde portapapeles, ordenar y filtrar, formato de texto/negrita, filas y columnas.
- Exportación a **XLSX** (SheetJS), **CSV** y **JSON**; importación de CSV.

### Editor de texto
- Bloques (párrafo, títulos, listas, cita, código), negrita/subrayado/tachado inline, alineación, enlaces, imágenes.
- Exportación a **DOCX** (biblioteca `docx`), **PDF** (impresión del navegador) y texto plano; importación de texto plano.

### General
- **Lanzador**: pantalla de inicio con plantillas, documentos recientes y control del espacio usado en almacenamiento (con borrado y confirmación).
- Autoguardado con *debounce* (400 ms) + guardado inmediato al cerrar la pestaña; renombrado de documentos.
- Tema claro/oscuro persistente.
- Rutas mediante hash (`#/documento/:id`, `#/hoja/:id`) → funciona sobre `file://`.

## Stack

- **React 18** + **TypeScript** 5
- **Vite 5** (build) y **Vitest 2** (tests)
- **Tailwind CSS 3** (clase oscura `class`) + tema claro/oscuro
- **react-router-dom** (HashRouter)
- **docx** (exportación .docx) y **xlsx** (exportación .xlsx)
- **lucide-react** (iconos) y **@fontsource-variable/inter** (tipografía)
- Sin backend: persistencia en `localStorage` (`folio.meta` índice + `folio.file.<id>` por documento)

## Puesta en marcha

```bash
npm install
npm run dev        # servidor de desarrollo de Vite
npm run build      # compilación de producción (dist/)
npm run preview    # previsualizar la build
```

## Calidad

```bash
npm run typecheck  # tsc --noEmit
npm run lint       # eslint con 0 avisos permitidos
npm run test       # vitest run (motor de fórmulas, recálculo, transformaciones, geometría, TSV)
npm run check      # typecheck + lint + test
```

## Estructura

```
src/
├── main.tsx / App.tsx            # arranque, proveedores y rutas
├── types/file.ts                 # modelos compartidos (FileRecord, SpreadsheetCell, …)
├── utils/                        # storage, ids, descarga, fechas, TSV, bytes
├── pages/Launcher.tsx            # pantalla de inicio
├── modules/document/             # editor de texto (bloques, comandos, export DOCX/PDF)
│   └── export/export{Docx,Pdf}.ts
└── modules/spreadsheet/
    ├── SpreadsheetView.tsx       # contenedor: carga, guardado, exportación
    ├── SheetGrid.tsx             # grid virtualizado e interacción
    ├── FormulaBar.tsx / SpreadsheetToolbar.tsx
    ├── state/reducer.ts          # reducer puro (escritura, orden, filtro, formato)
    └── engines/                  # lógica desacoplada y testeada
        ├── formula/              # tokenizer, parser, ast, evaluator
        ├── calc.ts               # recálculo con detección de ciclos
        ├── cellRef.ts            # refs A1 ⇄ coordenadas
        ├── cell.ts               # literales e interpretación tipo Excel
        ├── cellTransform.ts      # copiar/rellenar con desplazamiento de refs
        ├── gridGeometry.ts       # medidas y columnas visibles
        └── formats.ts            # CSV, impresión de celdas y números
```

## Limitaciones conocidas

- Exportación XLSX sin estilos (solo datos y fórmulas).
- PDF sin marcadores de accesibilidad (impresión del navegador).
- Tamaño límite del almacenamiento del navegador (~5 MB); la vista del lanzador muestra el uso.
- Localización limitada a español (UI) y motor de fórmulas bilingüe (es/en).

## Licencia

Privado / uso interno.