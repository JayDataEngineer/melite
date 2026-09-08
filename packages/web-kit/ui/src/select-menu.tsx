/**
 * SelectMenu — a tiny custom dropdown replacing native <select>.
 *
 * The native <select> can't be styled to match the editor's dense, dark theme
 * and renders option lists inconsistently across platforms. This component
 * provides keyboard navigation (↑/↓/Enter/Esc), click-outside dismiss, and a
 * themed popover. Generic over the string value type for blend modes, samplers,
 * schedulers, etc.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from "./utils"

export interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectMenuProps<T extends string> {
  value: T
  options: SelectOption<T>[]
  onChange: (v: T) => void
  className?: string
  buttonClassName?: string
  popoverClassName?: string
  disabled?: boolean
  'aria-label'?: string
  title?: string
}

export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  className,
  buttonClassName,
  popoverClassName,
  disabled,
  ...rest
}: SelectMenuProps<T>) {
  const [open, setOpen] = useState(false)
  const initialHover = Math.max(0, options.findIndex((o) => o.value === value))
  const [hover, setHover] = useState<number>(initialHover)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (open) setHover(Math.max(0, options.findIndex((o) => o.value === value)))
  }, [open, value, options])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setHover((h) => Math.min(options.length - 1, h + 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setHover((h) => Math.max(0, h - 1)) }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const o = options[hover]
        if (o) { onChange(o.value); close() }
      }
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, hover, options, onChange, close])

  return (
    <div className={cn('relative', className)}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center justify-between gap-1 rounded border border-border/40 bg-background px-1 text-[9px] font-medium outline-none transition-colors',
          'hover:border-border/60 focus-visible:border-brand/50',
          disabled && 'opacity-50',
          buttonClassName,
        )}
        {...rest}
      >
        <span className="truncate">{current?.label ?? value}</span>
        <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-60" />
      </button>
      {open && (
        <div
          ref={popRef}
          role="listbox"
          className={cn(
            'absolute z-50 mt-0.5 max-h-48 w-full min-w-[8rem] overflow-y-auto rounded border border-border/60 bg-popover shadow-lg',
            popoverClassName,
          )}
        >
          {options.map((o, i) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => { onChange(o.value); close() }}
              onMouseEnter={() => setHover(i)}
              className={cn(
                'flex w-full items-center px-1.5 py-0.5 text-left text-[9px] font-medium transition-colors',
                o.value === value ? 'bg-brand/15 text-brand' : 'hover:bg-muted',
                i === hover && o.value !== value && 'bg-muted',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
