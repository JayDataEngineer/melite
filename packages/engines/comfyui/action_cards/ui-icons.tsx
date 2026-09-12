/**
 * ui-icons — hand-authored inline-SVG glyphs replacing the icon library
 * for the action_cards package (DSH-pure UI law: no icon libraries).
 *
 * Same export names the viewers used from the icon library (inventory via
 * grep over the package, excluding the hands-off files: Play, Pause,
 * Volume2, VolumeX, Maximize, Minimize2, RotateCcw, RotateCw,
 * Loader2, AlertTriangle, Dices, ChevronDown).
 *
 * Stroke-icon look: 24×24 viewBox, stroke="currentColor", strokeWidth 2,
 * fill none, round caps/joins. Sizing + tint ride the caller's
 * className (each viewer's CSS module owns size/fill classes),
 * exactly like the old icon className sizing pattern did.
 *
 * Loader2 is the circular-arrow glyph with CSS spin baked in (the
 * .spin class in ui-icons.module.css) — callers drop their old
 * `animate-spin` utility; the spinner spins by construction.
 */
import type { JSX, ReactNode } from "react"
import styles from "./ui-icons.module.css"

export interface GlyphProps {
  className?: string
}

function Svg({ className, children }: GlyphProps & { children: ReactNode }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

export function Play({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <polygon points="6 3 20 12 6 21 6 3" />
    </Svg>
  )
}

export function Pause({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <rect width="4" height="16" x="6" y="4" />
      <rect width="4" height="16" x="14" y="4" />
    </Svg>
  )
}

export function Volume2({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </Svg>
  )
}

export function VolumeX({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" x2="16" y1="9" y2="15" />
      <line x1="16" x2="22" y1="9" y2="15" />
    </Svg>
  )
}

export function Maximize({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </Svg>
  )
}

export function Minimize2({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M4 14h6v6" />
      <path d="M20 10h-6V4" />
      <path d="m14 10 7-7" />
      <path d="m3 21 7-7" />
    </Svg>
  )
}

export function RotateCcw({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </Svg>
  )
}

export function RotateCw({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </Svg>
  )
}

export function Loader2({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className ? `${styles.spin} ${className}` : styles.spin}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </Svg>
  )
}

export function AlertTriangle({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Svg>
  )
}

export function Dices({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <rect width="12" height="12" x="2" y="10" rx="2" ry="2" />
      <path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6" />
      <path d="M6 18h.01" />
      <path d="M10 14h.01" />
      <path d="M15 6h.01" />
      <path d="M18 9h.01" />
    </Svg>
  )
}

export function ChevronDown({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  )
}
