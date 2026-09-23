import type { ReactNode } from 'react'

interface ToolbarButtonProps {
  icon: ReactNode
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children?: ReactNode
}

/** Botón de la barra de herramientas con tooltip accesible y estado activo. */
export function ToolbarButton({ icon, label, onClick, active, disabled, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5 text-sm transition-colors disabled:opacity-40 ${
        active
          ? 'bg-accent-100 text-accent-700 dark:bg-accent-600/25 dark:text-accent-300'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

/** Separador vertical entre grupos de la barra. */
export function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
}

/** Etiqueta compacta de grupo dentro de la barra de herramientas. */
export function ToolbarGroupLabel({ children }: { children: ReactNode }) {
  return (
    <span className="hidden px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:inline dark:text-slate-500">
      {children}
    </span>
  )
}