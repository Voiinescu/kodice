/** Generador de identificadores únicos legibles (suficiente para una app local). */
export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8)
  const nanos = Date.now().toString(36).slice(-4)
  return `${prefix}_${random}${nanos}`
}