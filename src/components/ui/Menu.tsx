import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'

export interface MenuHandle {
  close: () => void
}

interface MenuProps {
  trigger: ReactNode
  label?: string
  align?: 'left' | 'right'
  children: (close: () => void) => ReactNode
  className?: string
}

/** Menú/popover simple: botón + panel flotante con cierre por clic fuera/Escape. */
export const Menu = forwardRef<MenuHandle, MenuProps>(function Menu(
  { trigger, label, align = 'left', children, className },
  ref,
) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useClickOutside([containerRef, panelRef], () => setOpen(false), open)

  useImperativeHandle(ref, () => ({ close: () => setOpen(false) }))

  const toggle = () => setOpen((o) => !o)

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
          open
            ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
        }`}
      >
        {trigger}
        {label && <span className="sr-only">{label}</span>}
        {open && <ChevronDown className="ml-0.5 h-3.5 w-3.5" />}
      </button>
      {open && (
        <div
          ref={panelRef}
          role="menu"
          className={`absolute z-50 mt-1 min-w-[200px] rounded-lg border border-slate-200 bg-white p-1 shadow-pop dark:border-slate-700 dark:bg-slate-800 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
})

export function MenuItem({
  icon,
  children,
  onClick,
  active,
  disabled,
}: {
  icon?: ReactNode
  children: ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      role="menuitemradio"
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors disabled:opacity-40 ${
        active
          ? 'bg-accent-50 text-accent-700 dark:bg-accent-600/20 dark:text-accent-300'
          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      {icon && <span className="text-slate-400 dark:text-slate-400">{icon}</span>}
      <span className="flex-1">{children}</span>
    </button>
  )
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {children}
    </p>
  )
}

export function MenuDivider() {
  return <div className="my-1 h-px bg-slate-100 dark:bg-slate-700" />
}