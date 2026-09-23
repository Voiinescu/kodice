type AnyFn = (...args: never[]) => unknown

/** Debounce genérico: retrasa la llamada hasta que cese la actividad. */
export function debounce<F extends AnyFn>(fn: F, wait: number): (...args: Parameters<F>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<F>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}

/** Throttle simple: al menos una llamada cada `interval` ms. */
export function throttle<F extends AnyFn>(fn: F, interval: number): (...args: Parameters<F>) => void {
  let last = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<F>) => {
    const now = Date.now()
    const remaining = interval - (now - last)
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      last = now
      fn(...args)
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now()
        fn(...args)
      }, remaining)
    }
  }
}