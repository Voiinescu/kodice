import { useId } from 'react'
import type { CSSProperties } from 'react'

interface ColorFieldProps {
  label: string
  value?: string
  onChange: (hex: string) => void
  /** clase extra para icono estilo "relleno" cuando se usa como color de fondo */
  twoTone?: boolean
}

/** Selector de color compacto que abre el color picker nativo del navegador. */
export function ColorField({ label, value, onChange, twoTone }: ColorFieldProps) {
  const id = useId()
  const style: CSSProperties = twoTone
    ? {
        background: `linear-gradient(135deg, ${value ?? '#e2e8f0'} 50%, #fff 50%)`,
      }
    : { backgroundColor: value ?? '#e2e8f0' }

  return (
    <label
      htmlFor={id}
      title={label}
      aria-label={label}
      className="block h-6 w-6 cursor-pointer rounded-md border border-slate-200 shadow-sm transition-transform hover:scale-105 dark:border-slate-600"
      style={style}
    >
      <input
        id={id}
        type="color"
        value={value ?? '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
    </label>
  )
}