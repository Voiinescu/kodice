import type { useDocumentEditor } from './editor/useDocumentEditor'

/** Tipo del controlador expuesto por el hook del editor del documento. */
export type DocumentEditor = ReturnType<typeof useDocumentEditor>