import { useEffect } from 'react'
import type { RefObject } from 'react'

/** Llama `onClose` cuando se hace clic fuera de los refs indicados. */
export function useClickOutside(
  refs: RefObject<HTMLElement | null>[],
  onClose: () => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return
    const handler = (event: MouseEvent) => {
      const target = event.target as Node
      const inside = refs.some((r) => r.current?.contains(target))
      if (!inside) onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [refs, onClose, enabled])
}