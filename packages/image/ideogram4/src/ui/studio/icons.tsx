/**
 * Ideogram studio glyphs — hand-authored inline SVGs replacing the
 * old icon-package imports (DSH-pure stroke, law 5). Same export names
 * as the icon components they replace, so call sites only change
 * the import line.
 *
 * Every glyph: 24×24 viewBox, stroke="currentColor", strokeWidth 2,
 * fill none, round caps/joins. Sizing rides the caller's className
 * (size utilities are studio CSS-module classes now).
 */
import type { CSSProperties } from "react"

export interface IconProps {
  className?: string
  style?: CSSProperties
}

function Svg({
  className,
  style,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      {children}
    </svg>
  )
}

export function Box({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M21 8.5v7a2 2 0 0 1-1 1.73l-6 3.5a2 2 0 0 1-2 0l-6-3.5A2 2 0 0 1 5 15.5v-7a2 2 0 0 1 1-1.73l6-3.5a2 2 0 0 1 2 0l6 3.5a2 2 0 0 1 1 1.73Z" />
      <path d="m5.3 7.3 6.7 3.9 6.7-3.9" />
      <path d="M12 22V11" />
    </Svg>
  )
}

export function Type({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M4 7V5h16v2" />
      <path d="M12 5v14" />
      <path d="M9 19h6" />
    </Svg>
  )
}

export function Trash2({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </Svg>
  )
}

export function Copy({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  )
}

export function Grid3x3({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </Svg>
  )
}

export function Magnet({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15" />
      <path d="m5 8 4 4" />
      <path d="m12 15 4 4" />
    </Svg>
  )
}

export function Maximize2({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M15 3h6v6" />
      <path d="m21 3-7 7" />
      <path d="m3 21 7-7" />
      <path d="M9 21H3v-6" />
    </Svg>
  )
}

export function ChevronUp({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="m18 15-6-6-6 6" />
    </Svg>
  )
}

export function ChevronDown({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  )
}

export function Sparkles({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M12 3v3m0 12v3M5.6 5.6l2.2 2.2m8.4 8.4 2.2 2.2M3 12h3m12 0h3M5.6 18.4l2.2-2.2m8.4-8.4 2.2-2.2" />
      <path d="M12 8.5 13.7 12l3.8 1.5-3.8 1.5L12 18.5 10.3 15l-3.8-1.5L10.3 12 12 8.5Z" />
    </Svg>
  )
}

export function Wand2({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
      <path d="m14 7 3 3" />
      <path d="M5 6v4" />
      <path d="M19 14v4" />
      <path d="M3 8h4" />
      <path d="M17 16h4" />
    </Svg>
  )
}

export function Code2({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </Svg>
  )
}

export function Layers({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="m12 2 9 4.9-9 4.9-9-4.9L12 2Z" />
      <path d="m3 11.9 9 4.9 9-4.9" />
      <path d="m3 16.9 9 4.9 9-4.9" />
    </Svg>
  )
}

export function Palette({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <circle cx="13.5" cy="6.5" r="1" />
      <circle cx="17.5" cy="10.5" r="1" />
      <circle cx="8.5" cy="7.5" r="1" />
      <circle cx="6.5" cy="12.5" r="1" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.26-.29-.43-.68-.43-1.12A1.68 1.68 0 0 1 14.46 16h2.08A5.46 5.46 0 0 0 22 10.5C21.94 5.75 17.5 2 12 2Z" />
    </Svg>
  )
}

export function Square({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </Svg>
  )
}

export function RectangleHorizontal({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
    </Svg>
  )
}

export function RectangleVertical({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <rect x="6" y="2" width="12" height="20" rx="2" />
    </Svg>
  )
}

export function Upload({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5" />
      <path d="M12 3v12" />
    </Svg>
  )
}

export function Plus({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  )
}

export function ClipboardCopy({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </Svg>
  )
}

export function Check({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  )
}

export function Image({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5a1.5 1.5 0 0 0-2 0L6 21" />
    </Svg>
  )
}

export function X({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Svg>
  )
}
