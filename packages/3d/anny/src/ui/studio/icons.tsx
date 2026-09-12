/**
 * Anny studio glyphs — hand-authored inline SVGs replacing the
 * old icon-package imports (DSH-pure stroke, law 5). Same export
 * names as the icon components they replace, so call sites only
 * change the import line.
 *
 * Every glyph: 24×24 viewBox, stroke="currentColor", strokeWidth 2,
 * fill none, round caps/joins. Sizing rides the caller's className
 * (studio CSS-module classes now).
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

export function Loader2({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </Svg>
  )
}

export function PersonStanding({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <circle cx="12" cy="5" r="1" />
      <path d="m9 20 3-6 3 6" />
      <path d="m6 8 6 2 6-2" />
      <path d="M12 10v4" />
    </Svg>
  )
}

export function Sparkles({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M12 3l1.9 5.8 5.8 1.9-5.8 1.9L12 18.4l-1.9-5.8L4.3 10.7l5.8-1.9L12 3z" />
      <path d="M19 3l.7 2.1 2.1.7-2.1.7L19 8.6l-.7-2.1-2.1-.7 2.1-.7L19 3z" />
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

export function X({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
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

export function AlertTriangle({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Svg>
  )
}
