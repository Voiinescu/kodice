import type { FileMeta, FileRecord, FileType, SpreadsheetFile, DocumentFile } from '../types/file'
import { createId } from './id'
import { createEmptyDocument } from '../modules/document/defaults'
import { createEmptySpreadsheet } from '../modules/spreadsheet/defaults'

/**
 * Capa de persistencia sobre localStorage.
 *
 * Diseño: se guarda un índice ligero en `folio.meta` y cada archivo completo en
 * `folio.file.<id>`. Se usa localStorage (y no IndexedDB) por simplicidad y porque
 * los volúmenes esperados (documentos HTML y hojas ≤1000 celdas) caben holgados;
 * la API es trivial de reemplazar por IndexedDB si hiciera falta más capacidad.
 */

const META_KEY = 'folio.meta'
const FILE_PREFIX = 'folio.file.'

const isRecord = (v: unknown): v is FileRecord =>
  typeof v === 'object' && v !== null && 'id' in v && 'type' in v

function readFile(id: string): FileRecord | null {
  try {
    const raw = localStorage.getItem(FILE_PREFIX + id)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function getFileMeta(): FileMeta[] {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as FileMeta[]) : []
  } catch {
    return []
  }
}

export function getFile(id: string): FileRecord | null {
  return readFile(id)
}

/** Persiste un archivo y actualiza el índice "recientes". */
export function saveFile(file: FileRecord): void {
  localStorage.setItem(FILE_PREFIX + file.id, JSON.stringify(file))
  const meta: FileMeta = {
    id: file.id,
    type: file.type,
    name: file.name,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  }
  const index = getFileMeta().filter((m) => m.id !== meta.id)
  index.unshift(meta)
  localStorage.setItem(META_KEY, JSON.stringify(index.slice(0, 50)))
}

export function removeFile(id: string): void {
  localStorage.removeItem(FILE_PREFIX + id)
  const index = getFileMeta().filter((m) => m.id !== id)
  localStorage.setItem(META_KEY, JSON.stringify(index))
}

export function createNewFile(type: FileType, name?: string): FileRecord {
  const now = Date.now()
  const id = createId(type === 'document' ? 'doc' : 'sheet')
  if (type === 'document') {
    const doc: DocumentFile = { ...createEmptyDocument(), type: 'document', id, name: name ?? 'Documento sin título', createdAt: now, updatedAt: now }
    saveFile(doc)
    return doc
  }
  const sheet: SpreadsheetFile = {
    ...createEmptySpreadsheet(),
    type: 'spreadsheet',
    id,
    name: name ?? 'Hoja de cálculo sin título',
    createdAt: now,
    updatedAt: now,
  }
  saveFile(sheet)
  return sheet
}

export function updateFileMeta(id: string, patch: Partial<Pick<FileMeta, 'name'>>): void {
  const file = readFile(id)
  if (!file) return
  const next = { ...file, ...patch, updatedAt: Date.now() } as FileRecord
  saveFile(next)
}

/** Billete de errores de cuota: los archivos grandes (imágenes) pueden agotar los ~5 MB. */
export const storageErrorKeys = {
  quota: 'folio.quota-error',
} as const

export function hasQuotaErrors(): boolean {
  try {
    return localStorage.getItem(storageErrorKeys.quota) === '1'
  } catch {
    return false
  }
}

export function clearQuotaErrors(): void {
  try {
    localStorage.removeItem(storageErrorKeys.quota)
  } catch {
    /* noop */
  }
}

/** Uso estimado del almacenamiento (bytes) perteneciente a la app. */
export function usageBytes(): number {
  let total = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !(key === META_KEY || key.startsWith(FILE_PREFIX))) continue
      total += (localStorage.getItem(key)?.length ?? 0) * 2
    }
  } catch {
    /* noop */
  }
  return total
}

export const IS_SSR = typeof window === 'undefined'