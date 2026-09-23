const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

function compactNumber(n: number): string {
  return new Intl.NumberFormat('es').format(n)
}

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

/** Fecha legible y relativa: "ahora", "hace 5 min", "hoy 14:32", "12 sep". */
export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const diff = now - timestamp
  if (diff < MINUTE) return 'ahora mismo'
  if (diff < HOUR) return `hace ${compactNumber(Math.floor(diff / MINUTE))} min`
  if (diff < 3 * HOUR) return `hace ${compactNumber(Math.floor(diff / HOUR))} h`

  const d = new Date(timestamp)
  const today = new Date(now)
  const sameDay = d.toDateString() === today.toDateString()
  if (sameDay) {
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `hoy ${hh}:${mm}`
  }
  const yesterday = new Date(now - DAY)
  if (d.toDateString() === yesterday.toDateString()) return 'ayer'

  if (d.getFullYear() === today.getFullYear()) {
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`
  }
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Nombre de archivo con sello de tiempo para exportaciones. */
export function timestampFileName(base: string): string {
  const d = new Date()
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
  return `${base}-${stamp}`
}

export function weekdayLabel(date: Date): string {
  return DAYS[date.getDay()]
}