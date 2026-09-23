/**
 * Utilidades de volumen: conversión de bytes a unidades legibles
 * para el medidor de almacenamiento del launcher.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 kB'
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} kB`
  return `${(kb / 1024).toFixed(2)} MB`
}

export const LOCAL_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024